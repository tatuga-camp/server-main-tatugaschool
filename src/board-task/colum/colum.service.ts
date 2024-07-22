import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersService } from 'src/users/users.service';
import { ColumRepository } from './colum.repository';
import { CreateColumDto } from './dto/create-colum.dto';
import { DeleteColumDto } from './dto/delete-colum.dto';
import { UpdateColumDto } from './dto/update-colum.dto';

@Injectable()
export class ColumService {
  private readonly logger = new Logger(ColumService.name);

  constructor(
    private readonly columRepository: ColumRepository,
    private readonly usersService: UsersService,
  ) {}

  async createColum(createColumDto: CreateColumDto, user: User) {
    this.logger.log('Creating a new colum', { createColumDto, user });
    try {
      await this.usersService.isMemberOfTeam(user.id, createColumDto.teamId);
      return this.columRepository.create({ data: createColumDto });
    } catch (error) {
      this.logger.error('Error creating colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async updateColum(updateColumDto: UpdateColumDto, user: User) {
    this.logger.log('Updating colum', { updateColumDto, user });
    try {
      const colum = await this.columRepository.findById({
        columId: updateColumDto.query.columId,
      });
      if (!colum) throw new NotFoundException('Colum not found');
      await this.usersService.isMemberOfTeam(user.id, colum.teamId);
      return this.columRepository.update({
        columId: updateColumDto.query.columId,
        data: updateColumDto.body,
      });
    } catch (error) {
      this.logger.error('Error updating colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async deleteColum(deleteColumDto: DeleteColumDto, user: User) {
    this.logger.log('Deleting colum', { deleteColumDto, user });
    try {
      const colum = await this.columRepository.findById({
        columId: deleteColumDto.columId,
      });
      if (!colum) throw new NotFoundException('Colum not found');
      await this.usersService.isMemberOfTeam(user.id, colum.teamId);
      return this.columRepository.delete({ columId: deleteColumDto.columId });
    } catch (error) {
      this.logger.error('Error deleting colum', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getColumById(columId: string, user: User) {
    this.logger.log('Getting colum by id', { columId, user });
    try {
      const colum = await this.columRepository.findById({ columId });
      if (!colum) throw new NotFoundException('Colum not found');
      await this.usersService.isMemberOfTeam(user.id, colum.teamId);
      return colum;
    } catch (error) {
      this.logger.error('Error getting colum by id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getColumsByBoardId(boardId: string, user: User) {
    this.logger.log('Getting colums by board id', { boardId, user });
    try {
      // Here you might also want to check if the user is part of the board's team
      return this.columRepository.findByBoardId({ boardId });
    } catch (error) {
      this.logger.error('Error getting colums by board id', error.stack);
      throw new InternalServerErrorException(error.message);
    }
  }
}
