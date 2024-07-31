import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { DeleteBoardDto } from './dto/delete-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { GetUser } from 'src/auth/decorators';
import { User } from '@prisma/client';
import { GetBoardByPageDto } from './dto/get-board.dto';
import { UserGuard } from '../../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/boards')
export class BoardController {
  constructor(private boardService: BoardService) {}

  @Post()
  async createBoard(
    @Body() createBoardDto: CreateBoardDto,
    @GetUser() user: User,
  ) {
    return this.boardService.createBoard(createBoardDto, user);
  }

  @Patch()
  async updateBoard(
    @Body() updateBoardDto: UpdateBoardDto,
    @GetUser() user: User,
  ) {
    return this.boardService.updateBoard(updateBoardDto, user);
  }

  @Delete()
  async deleteBoard(
    @Body() deleteBoardDto: DeleteBoardDto,
    @GetUser() user: User,
  ) {
    return this.boardService.deleteBoard(deleteBoardDto, user);
  }

  @Get(':boardId')
  async getBoardById(@Param('boardId') boardId: string, @GetUser() user: User) {
    return this.boardService.getBoardById(boardId, user);
  }

  @Get('team/:teamId')
  async getBoardsByTeamId(
    @Param('teamId') teamId: string,
    @Query() query: GetBoardByPageDto,
    @GetUser() user: User,
  ) {
    const { page, limit } = query;
    return this.boardService.getBoardsByTeamId(teamId, page, limit, user);
  }
}
