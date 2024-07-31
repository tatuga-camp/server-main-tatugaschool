import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Board } from '@prisma/client';
import {
  RequestCreateBoard,
  RequestUpdateBoard,
  RequestDeleteBoard,
  RequestGetBoard,
  RequestGetBoardsByTeamId,
} from './board.interface';
import { Pagination } from 'src/interfaces';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export interface BoardRepositoryType {
  create(request: RequestCreateBoard): Promise<Board>;
  update(request: RequestUpdateBoard): Promise<Board>;
  delete(request: RequestDeleteBoard): Promise<Board>;
  findById(request: RequestGetBoard): Promise<Board | null>;
  findByTeamId(request: RequestGetBoardsByTeamId): Promise<Pagination<Board>>;
}

@Injectable()
export class BoardRepository implements BoardRepositoryType {
  logger: Logger = new Logger('BoardRepository');
  constructor(private prisma: PrismaService) {}

  async create(request: RequestCreateBoard): Promise<Board> {
    try {
      return await this.prisma.board.create({
        data: request.data,
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async update(request: RequestUpdateBoard): Promise<Board> {
    try {
      return await this.prisma.board.update({
        where: { id: request.boardId },
        data: request.data,
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async delete(request: RequestDeleteBoard): Promise<Board> {
    try {
      return await this.prisma.board.delete({
        where: { id: request.boardId },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findById(request: RequestGetBoard): Promise<Board | null> {
    try {
      return await this.prisma.board.findUnique({
        where: { id: request.boardId },
      });
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async findByTeamId(
    request: RequestGetBoardsByTeamId,
  ): Promise<Pagination<Board>> {
    try {
      const { teamId, page, limit } = request;
      const count = await this.prisma.board.count({
        where: { teamId },
      });

      const data = await this.prisma.board.findMany({
        where: { teamId },
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = Math.ceil(count / limit);
      if (page > total) {
        return {
          data: [],
          meta: {
            total: 1,
            lastPage: 1,
            currentPage: 1,
            prev: 1,
            next: 1,
          },
        };
      }
      return {
        data,
        meta: {
          total: total,
          lastPage: total,
          currentPage: page,
          prev: page - 1 < 0 ? page : page - 1,
          next: page + 1 > total ? page : page + 1,
        },
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
