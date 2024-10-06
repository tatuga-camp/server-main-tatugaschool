import { UsersService } from './users.service';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserGuard } from '../auth/guard';
import { UpdateUserDto } from './dto';

@Controller('v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(UserGuard)
  @Get('me')
  GetUser(@GetUser() user: User) {
    return this.usersService.GetUser(user);
  }

  @UseGuards(UserGuard)
  @Patch()
  UpdateUser(@Body() dto: UpdateUserDto, @GetUser() user: User) {
    return this.usersService.updateUser(dto, user);
  }
}
