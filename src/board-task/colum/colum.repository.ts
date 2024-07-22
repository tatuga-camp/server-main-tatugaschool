import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Colum } from '@prisma/client';
import {
  RequestCreateColum,
  RequestUpdateColum,
  RequestDeleteColum,
  RequestGetColum,
  RequestGetColumsByBoardId,
} from './colum.interface';

export interface ColumRepositoryType {
  create(request: RequestCreateColum): Promise<Colum>;
  update(request: RequestUpdateColum): Promise<Colum>;
  delete(request: RequestDeleteColum): Promise<Colum>;
  findById(request: RequestGetColum): Promise<Colum | null>;
  findByBoardId(request: RequestGetColumsByBoardId): Promise<Colum[]>;
}

@Injectable()
export class ColumRepository implements ColumRepositoryType {
  private readonly logger = new Logger(ColumRepository.name);

  constructor(private prisma: PrismaService) {}

  async create(request: RequestCreateColum): Promise<Colum> {
    try {
      this.logger.log('Creating a new colum', request);
      return await this.prisma.colum.create({
        data: request.data,
      });
    } catch (error) {
      this.logger.error('Error creating colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async update(request: RequestUpdateColum): Promise<Colum> {
    try {
      this.logger.log('Updating colum', request);
      return await this.prisma.colum.update({
        where: { id: request.columId },
        data: request.data,
      });
    } catch (error) {
      this.logger.error('Error updating colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async delete(request: RequestDeleteColum): Promise<Colum> {
    try {
      this.logger.log('Deleting colum', request);
      return await this.prisma.colum.delete({
        where: { id: request.columId },
      });
    } catch (error) {
      this.logger.error('Error deleting colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findById(request: RequestGetColum): Promise<Colum | null> {
    try {
      this.logger.log('Finding colum by id', request);
      return await this.prisma.colum.findUnique({
        where: { id: request.columId },
      });
    } catch (error) {
      this.logger.error('Error finding colum by id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async findByBoardId(request: RequestGetColumsByBoardId): Promise<Colum[]> {
    try {
      this.logger.log('Finding colums by board id', request);
      return await this.prisma.colum.findMany({
        where: { boardId: request.boardId },
      });
    } catch (error) {
      this.logger.error('Error finding colums by board id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }
}
