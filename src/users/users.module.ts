import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ImageService } from '../image/image.service';

@Module({
  providers: [UsersService, AuthService, JwtService, ImageService],
  controllers: [UsersController],
})
export class UsersModule {}
