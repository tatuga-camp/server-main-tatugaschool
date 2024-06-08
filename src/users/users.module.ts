import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserRepository } from './users.repository';
import { ImageService } from 'src/image/image.service';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, UserRepository, ImageService],
  exports: [UsersService],
})
export class UsersModule {}
