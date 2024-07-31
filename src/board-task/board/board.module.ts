import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardRepository } from './board.repository';
import { BoardService } from './board.service';
import { UsersService } from 'src/users/users.service';
import { TaskModule } from '../task/task.module';
import { ColumModule } from '../colum/colum.module';

@Module({
  imports: [TaskModule, ColumModule],
  providers: [BoardService, BoardRepository, UsersService],
  controllers: [BoardController],
})
export class BoardModule {}
