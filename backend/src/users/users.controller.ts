import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role, User } from '@prisma/client';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseUUIDPipe } from '../common/pipes/parse-uuid.pipe';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() currentUser: User) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }

    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    if ((dto.role as string) === 'SUPER_ADMIN' && (currentUser.role as string) !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admins can create Super Admin users');
    }
    return this.usersService.create(dto, currentUser.id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    if ((dto.role as string) === 'SUPER_ADMIN' && (currentUser.role as string) !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admins can assign the Super Admin role');
    }
    return this.usersService.update(id, dto, currentUser.id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') currentUserId: string) {
    return this.usersService.remove(id, currentUserId);
  }
}
