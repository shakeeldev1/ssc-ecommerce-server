import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { ListUsersQueryDto } from '@/modules/users/dto/list-users-query.dto';
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
}