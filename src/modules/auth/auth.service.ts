import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { parseDurationToMs } from '@/common/utils/duration.util';
import { Configuration } from '@/config/configuration';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { AuthTokensDto } from '@/modules/auth/dto/auth-tokens.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { RegisterResponseDto } from '@/modules/auth/dto/register-response.dto';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { JwtPayload } from '@/modules/auth/types/jwt-payload.interface';
import { OtpPurpose } from '@/modules/otp/enums/otp-purpose.enum';
import { OtpService } from '@/modules/otp/otp.service';
import { User } from '@/modules/users/entities/user.entity';
import { SELF_REGISTERABLE_ROLES } from '@/modules/users/enums/user-role.enum';
import { UserStatus } from '@/modules/users/enums/user-status.enum';
import { UsersService } from '@/modules/users/users.service';

const BCRYPT_SALT_ROUNDS = 10;

interface RefreshTokenPayload extends JwtPayload {
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Configuration, true>,
    private readonly auditLogService: AuditLogService,
    private readonly otpService: OtpService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string): Promise<RegisterResponseDto> {
    if (!SELF_REGISTERABLE_ROLES.includes(dto.role)) {
      throw new BadRequestException(
        `Role "${dto.role}" cannot be self-registered; it is provisioned separately`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
    });

    await this.auditLogService.record({
      actorUserId: user.id,
      action: 'auth.register',
      entityName: 'User',
      entityId: user.id,
      ipAddress,
    });

    await this.otpService.requestOtp(user.email, OtpPurpose.EMAIL_VERIFICATION);

    return {
      email: user.email,
      message: 'Registration successful. An OTP has been sent to your email.',
    };
  }

  async verifyEmail(email: string, code: string): Promise<AuthTokensDto> {
    await this.otpService.verifyOtp(email, code, OtpPurpose.EMAIL_VERIFICATION);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('No account found for this email');
    }

    await this.usersService.markEmailVerified(user.id);

    await this.auditLogService.record({
      actorUserId: user.id,
      action: 'auth.email_verified',
      entityName: 'User',
      entityId: user.id,
    });

    return this.issueTokens(user);
  }

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokensDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new ForbiddenException('Please verify your email before signing in');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('This account is not permitted to sign in');
    }

    await this.auditLogService.record({
      actorUserId: user.id,
      action: 'auth.login',
      entityName: 'User',
      entityId: user.id,
      ipAddress,
    });

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokensDto> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { id: payload.jti },
    });

    if (
      !storedToken ||
      storedToken.userId !== payload.sub ||
      storedToken.revokedAt !== null ||
      storedToken.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }

    await this.refreshTokenRepository.update(storedToken.id, { revokedAt: new Date() });

    const user = await this.usersService.findById(payload.sub);
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.refreshTokenRepository.update(payload.jti, { revokedAt: new Date() });
  }

  private async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.get('jwt', { infer: true }).refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }
  }

  /** Public entry point for other flows (e.g. card activation) that create a user and need to log them in immediately. */
  issueTokensForUser(user: User): Promise<AuthTokensDto> {
    return this.issueTokens(user);
  }

  /**
   * Completes the "set your password" step after card activation, which
   * logs the holder in with an unusable random password rather than
   * requiring one up front — see PROJECT_PLAN.md's card-activation notes.
   * Not a general password-reset endpoint: rejects if a real password is
   * already set (that'll be its own OTP-verified flow later).
   */
  async setPassword(userId: string, password: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (user.isPasswordSet) {
      throw new ConflictException('A password is already set for this account');
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    await this.usersService.setPassword(userId, passwordHash);

    await this.auditLogService.record({
      actorUserId: userId,
      action: 'auth.password_set',
      entityName: 'User',
      entityId: userId,
    });
  }

  private async issueTokens(user: User): Promise<AuthTokensDto> {
    const jwtConfig = this.configService.get('jwt', { infer: true });
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const refreshTokenEntity = await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        userId: user.id,
        expiresAt: new Date(Date.now() + parseDurationToMs(jwtConfig.refreshExpiresIn)),
      }),
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtConfig.accessSecret,
        expiresIn: jwtConfig.accessExpiresIn,
      }),
      this.jwtService.signAsync(
        { ...payload, jti: refreshTokenEntity.id },
        { secret: jwtConfig.refreshSecret, expiresIn: jwtConfig.refreshExpiresIn },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
