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
  CreateSchoolDto,
  DeleteSchoolDto,
  GetSchoolByIdDto,
  UpdateSchoolDto,
} from './dto';
import { SchoolService } from './school.service';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { AdminGuard, UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/schools')
export class SchoolController {
  constructor(private schoolService: SchoolService) {}

  @Post()
  async create(@GetUser() user: User, @Body() dto: CreateSchoolDto) {
    return await this.schoolService.createSchool(dto, user);
  }
  @Patch()
  async update(@Body() dto: UpdateSchoolDto, @GetUser() user: User) {
    return await this.schoolService.updateSchool(dto, user);
  }
  @Delete(':schoolId')
  async remove(@Param() dto: DeleteSchoolDto, @GetUser() user: User) {
    return this.schoolService.deleteSchool(dto, user);
  }
  @Get(':schoolId')
  async findOne(@Param() dto: GetSchoolByIdDto, @GetUser() user: User) {
    return this.schoolService.getSchoolById(dto, user);
  }
}
