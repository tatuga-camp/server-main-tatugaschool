import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BoardController } from './board.controller';
import { BoardRepository } from './board.repository';
import { BoardService } from './board.service';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';

@Module({
  imports: [PrismaModule, UsersModule],
  providers: [BoardService, BoardRepository, UsersService],
  controllers: [BoardController],
})
export class BoardModule {}
