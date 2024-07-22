import {
  Controller,
  Post,
  Body,
  Put,
  Delete,
  Get,
  Param,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { ColumService } from './colum.service';
import { CreateColumDto } from './dto/create-colum.dto';
import { DeleteColumDto } from './dto/delete-colum.dto';
import { UpdateColumDto } from './dto/update-colum.dto';
import { GetUser } from 'src/auth/decorators';

@Controller('colum')
export class ColumController {
  constructor(private readonly columService: ColumService) {}

  @Post()
  createColum(@Body() createColumDto: CreateColumDto, @GetUser() user: User) {
    return this.columService.createColum(createColumDto, user);
  }

  @Put()
  updateColum(@Body() updateColumDto: UpdateColumDto, @GetUser() user: User) {
    return this.columService.updateColum(updateColumDto, user);
  }

  @Delete()
  deleteColum(@Body() deleteColumDto: DeleteColumDto, @GetUser() user: User) {
    return this.columService.deleteColum(deleteColumDto, user);
  }

  @Get(':columId')
  getColumById(@Param('columId') columId: string, @GetUser() user: User) {
    return this.columService.getColumById(columId, user);
  }

  @Get('board/:boardId')
  getColumsByBoardId(@Param('boardId') boardId: string, @GetUser() user: User) {
    return this.columService.getColumsByBoardId(boardId, user);
  }
}
