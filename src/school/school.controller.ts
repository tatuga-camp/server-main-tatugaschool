import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateSchoolDto, UpdateSchoolDto } from './dto';
import { SchoolService } from './school.service';
import { GetUser } from 'src/auth/decorators';
import { User } from '@prisma/client';

@Controller('v1/school')
export class SchoolController {
  constructor(private schoolService: SchoolService) {}

  @Post()
  async create(@GetUser() user: User, @Body() dto: CreateSchoolDto) {
    return await this.schoolService.createSchool(user, dto);
  }
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return await this.schoolService.updateSchool(id, dto);
  }
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.schoolService.deleteSchool(id);
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.schoolService.getSchoolById(id);
  }
}