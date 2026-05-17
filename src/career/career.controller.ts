import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateCareerDto,
  DeleteCareerDto,
  GetCarrerById,
  GetSuggestDto,
  UpdateCareerDto,
} from './dto';
import { UserGuard } from '../auth/guard';
import { CareerService } from './career.service';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserJwtPayload } from '../interfaces/jwt-payload';

@Controller('v1/careers')
export class CareerController {
  constructor(private careerService: CareerService) {}

  @UseGuards(UserGuard)
  @Get(':careerId')
  getByPage(@Param() dto: GetCarrerById) {
    return this.careerService.getOne(dto);
  }

  @UseGuards(UserGuard)
  @Get('suggest/:studentId')
  suggestCarrer(@Param() dto: GetSuggestDto, @GetUser() user: UserJwtPayload) {
    return this.careerService.suggest(dto, user);
  }

  @UseGuards(UserGuard)
  @Post()
  create(@Body() dto: CreateCareerDto, @GetUser() user: UserJwtPayload) {
    return this.careerService.create(dto, user);
  }

  @UseGuards(UserGuard)
  @Patch()
  update(@Body() dto: UpdateCareerDto, @GetUser() user: UserJwtPayload) {
    return this.careerService.update(dto, user);
  }

  @UseGuards(UserGuard)
  @Delete(':id')
  delete(@Param() dto: DeleteCareerDto, @GetUser() user: UserJwtPayload) {
    return this.careerService.delete(dto, user);
  }
}
