import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from '@/modules/auth/auth.service';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { AuthTokensDto } from '@/modules/auth/dto/auth-tokens.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { RefreshTokenDto } from '@/modules/auth/dto/refresh-token.dto';
import { RegisterResponseDto } from '@/modules/auth/dto/register-response.dto';
import { RegisterDto } from '@/modules/auth/dto/register.dto';
import { SetPasswordDto } from '@/modules/auth/dto/set-password.dto';
import { VerifyEmailDto } from '@/modules/auth/dto/verify-email.dto';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Self-register a Student or Wholesale Buyer account' })
  register(@Body() dto: RegisterDto, @Req() request: Request): Promise<RegisterResponseDto> {
    return this.authService.register(dto, request.ip);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify the OTP sent to email and activate the account' })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthTokensDto> {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<AuthTokensDto> {
    return this.authService.login(dto, request.ip);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new token pair' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokensDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  me(@CurrentUser() currentUser: AuthenticatedUser): Promise<User> {
    return this.usersService.findById(currentUser.id);
  }

  @Post('set-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set a password for accounts created via card activation (first time only)',
  })
  async setPassword(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SetPasswordDto,
  ): Promise<void> {
    await this.authService.setPassword(currentUser.id, dto.password);
  }
}
