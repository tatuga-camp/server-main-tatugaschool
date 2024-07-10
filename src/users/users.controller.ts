import { UsersService } from './users.service';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

@Controller('v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  GetUser(@GetUser() user: User) {
    return this.usersService.GetUser(user);
  }
}
