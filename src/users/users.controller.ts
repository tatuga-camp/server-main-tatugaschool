import { UsersService } from './users.service';
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { NoVerifyUserGuard, UserGuard } from '../auth/guard';
import { GetUserByEmailDto, UpdatePasswordDto, UpdateUserDto } from './dto';

@Controller('v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(UserGuard)
  @Get('me')
  GetUser(@GetUser() user: User) {
    return this.usersService.GetUser(user);
  }

  @UseGuards(NoVerifyUserGuard)
  @Post('resend-verify-email')
  ResendVerifyEmail(@GetUser() user: User) {
    return this.usersService.ResendVerifyEmail(user);
  }

  @UseGuards(NoVerifyUserGuard)
  @Get('noverify-user')
  GetUserNoVerify(@GetUser() user: User) {
    return this.usersService.GetUser(user);
  }

  @UseGuards(UserGuard)
  @Get()
  GetUserByEmail(@Query() dto: GetUserByEmailDto) {
    return this.usersService.GetUserByEmail(dto);
  }

  @UseGuards(UserGuard)
  @Patch('password')
  UpdatePassword(@Body() dto: UpdatePasswordDto, @GetUser() user: User) {
    return this.usersService.updatePassword(dto, user);
  }

  @UseGuards(NoVerifyUserGuard)
  @Patch()
  UpdateUser(@Body() dto: UpdateUserDto, @GetUser() user: User) {
    return this.usersService.updateUser(dto, user);
  }
}
