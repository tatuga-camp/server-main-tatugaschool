import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BoardRepository } from './board.repository';
import { UsersService } from '../../users/users.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { DeleteBoardDto } from './dto/delete-board.dto';
import { User } from '@prisma/client';

@Injectable()
export class BoardService {
  logger: Logger = new Logger('BoardService');
  constructor(
    private boardRepository: BoardRepository,
    private usersService: UsersService,
  ) {}
  async createBoard(createBoardDto: CreateBoardDto, user: User) {
    const { teamId, ...boardData } = createBoardDto;

    try {
      const isMember = await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId,
      });

      if (!isMember) {
        throw new ForbiddenException(
          'You do not have permission to create a board in this team',
        );
      }

      const board = await this.boardRepository.create({
        data: { teamId, ...boardData },
      });

      return {
        message: 'Board created successfully',
        board,
      };
    } catch (error) {
      this.logger.error('Error creating board:', error);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to create board');
    }
  }
  async updateBoard(updateBoardDto: UpdateBoardDto, user: User) {
    try {
      const { query } = updateBoardDto;
      const { boardId } = query;

      const board = await this.boardRepository.findById({ boardId });

      if (!board) {
        throw new NotFoundException('Board not found');
      }

      const hasAccess = await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: board.teamId,
      });

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to update this board',
        );
      }

      const updatedBoard = await this.boardRepository.update({
        boardId,
        data: updateBoardDto.body,
      });

      return {
        message: 'Board updated successfully',
        board: updatedBoard,
      };
    } catch (error) {
      this.logger.error('Error updating board:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to update board');
    }
  }
  async deleteBoard(deleteBoardDto: DeleteBoardDto, user: User) {
    const { boardId } = deleteBoardDto;

    try {
      const board = await this.boardRepository.findById({ boardId });

      if (!board) {
        throw new NotFoundException('Board not found');
      }

      const hasAccess = await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: board.teamId,
      });

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to delete this board',
        );
      }

      await this.boardRepository.delete({ boardId });

      return {
        message: 'Board deleted successfully',
        boardId,
      };
    } catch (error) {
      this.logger.error('Error deleting board:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to delete board');
    }
  }
  async getBoardById(boardId: string, user: User) {
    try {
      const board = await this.boardRepository.findById({ boardId });

      if (!board) {
        throw new NotFoundException('Board not found');
      }

      const hasAccess = await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId: board.teamId,
      });

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to view this board',
        );
      }

      return board;
    } catch (error) {
      this.logger.error('Error fetching board:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to fetch board');
    }
  }
  async getBoardsByTeamId(
    teamId: string,
    page: number,
    limit: number,
    user: User,
  ) {
    try {
      const hasAccess = await this.usersService.isMemberOfTeam({
        userId: user.id,
        teamId,
      });

      if (!hasAccess) {
        throw new ForbiddenException(
          'You do not have permission to view boards in this team',
        );
      }

      const boards = await this.boardRepository.findByTeamId({
        teamId,
        page,
        limit,
      });

      return {
        message: 'Boards retrieved successfully',
        teamId,
        page,
        limit,
        boards,
      };
    } catch (error) {
      this.logger.error('Error retrieving boards:', error);
      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to retrieve boards');
    }
  }
}
