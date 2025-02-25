import { TeamRepository } from './../../team/team.repository';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { ColumRepository } from './colum.repository';
import { CreateColumDto } from './dto/create-colum.dto';
import { DeleteColumDto } from './dto/delete-colum.dto';
import { UpdateColumDto } from './dto/update-colum.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { BoardRepository } from '../board/board.repository';

@Injectable()
export class ColumService {
  private readonly logger = new Logger(ColumService.name);
  columRepository: ColumRepository;
  private teamRepository: TeamRepository;
  private boardRepository: BoardRepository;

  constructor(
    private readonly usersService: UsersService,
    private prisma: PrismaService,
  ) {
    this.boardRepository = new BoardRepository(this.prisma);
    this.teamRepository = new TeamRepository(this.prisma);
    this.columRepository = new ColumRepository(this.prisma);
  }

  async createColum(createColumDto: CreateColumDto, user: User) {
    try {
      const board = await this.boardRepository.findById({
        boardId: createColumDto.boardId,
      });

      if (!board) throw new NotFoundException('Board not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: board.teamId,
      });
      return await this.columRepository.create({
        data: {
          ...createColumDto,
          teamId: board.teamId,
          schoolId: board.schoolId,
        },
      });
    } catch (error) {
      this.logger.error('Error creating colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateColum(updateColumDto: UpdateColumDto, user: User) {
    try {
      const colum = await this.columRepository.findById({
        columId: updateColumDto.query.columId,
      });
      if (!colum) throw new NotFoundException('Colum not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: colum.teamId,
      });
      return await this.columRepository.update({
        columId: updateColumDto.query.columId,
        data: updateColumDto.body,
      });
    } catch (error) {
      this.logger.error('Error updating colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteColum(deleteColumDto: DeleteColumDto, user: User) {
    try {
      const colum = await this.columRepository.findById({
        columId: deleteColumDto.columId,
      });
      if (!colum) throw new NotFoundException('Colum not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: colum.teamId,
      });
      return await this.columRepository.delete({
        columId: deleteColumDto.columId,
      });
    } catch (error) {
      this.logger.error('Error deleting colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getColumById(columId: string, user: User) {
    try {
      const colum = await this.columRepository.findById({ columId });
      if (!colum) throw new NotFoundException('Colum not found');
      await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: colum.teamId,
      });
      return colum;
    } catch (error) {
      this.logger.error('Error getting colum by id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getColumsByBoardId(boardId: string, user: User) {
    try {
      // Here you might also want to check if the user is part of the board's team
      return this.columRepository.findByBoardId({ boardId });
    } catch (error) {
      this.logger.error('Error getting colums by board id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }
}
