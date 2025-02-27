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
import { AdminGuard, UserGuard } from '../auth/guard';
import { CareerService } from './career.service';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';

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
  suggestCarrer(@Param() dto: GetSuggestDto, @GetUser() user: User) {
    return this.careerService.suggest(dto, user);
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() dto: CreateCareerDto) {
    return this.careerService.create(dto);
  }

  @UseGuards(AdminGuard)
  @Patch()
  update(@Body() dto: UpdateCareerDto) {
    return this.careerService.update(dto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  delete(@Param() dto: DeleteCareerDto) {
    return this.careerService.delete(dto);
  }
}
