import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ImageService } from '../image/image.service';
import { UserRepository } from './users.repository';

@Module({
  providers: [
    UsersService,
    AuthService,
    JwtService,
    ImageService,
    UserRepository,
  ],
  controllers: [UsersController],
})
export class UsersModule {}
