import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardRepository } from './board.repository';
import { BoardService } from './board.service';
import { UsersService } from '../../users/users.service';
import { TaskModule } from '../task/task.module';
import { ColumModule } from '../colum/colum.module';
import { TeamRepository } from '../../team/team.repository';

@Module({
  imports: [TaskModule, ColumModule],
  providers: [BoardService, BoardRepository, UsersService, TeamRepository],
  controllers: [BoardController],
})
export class BoardModule {}
