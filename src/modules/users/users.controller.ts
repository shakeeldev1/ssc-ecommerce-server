import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { AuthenticatedUser } from '@/modules/auth/types/jwt-payload.interface';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { ListUsersQueryDto } from '@/modules/users/dto/list-users-query.dto';
import { UpdateUserStatusDto } from '@/modules/users/dto/update-user-status.dto';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('users')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List platform users with search and role/status filters' })
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Block, suspend or re-activate a user account' })
  setStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.setStatus(id, dto.status, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a user account' })
  remove(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.removeAsAdmin(id, actor);
  }
}
