import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Query,
  Delete,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { ReorderClassDto, UpdateClassDto } from './dto/update-class.dto';
import { GetClassByPageDto, GetClassDto } from './dto/get-class.dto';
import { DeleteClassDto } from './dto/delete-class.dto';
import { GetUser } from 'src/auth/decorators';
import { User } from '@prisma/client';

@Controller('v1/classes')
export class ClassController {
  constructor(private classService: ClassService) {}

  @Get(':classId')
  async getClassById(@Param() params: GetClassDto, @GetUser() user: User) {
    return this.classService.getClassById(params.id, user);
  }

  @Get()
  async getClassesWithPagination(
    @Query() query: GetClassByPageDto,
    @GetUser() user: User,
  ) {
    const { page, limit, schoolId } = query;
    return this.classService.getClassesWithPagination(
      page,
      limit,
      schoolId,
      user,
    );
  }

  @Post('reorder')
  async reorderClasses(
    @Body() reorderClassDto: ReorderClassDto,
    @GetUser() user: User,
  ) {
    return this.classService.reorderClasses(reorderClassDto, user);
  }

  @Post()
  async createClass(
    @Body() createClassDto: CreateClassDto,
    @GetUser() user: User,
  ) {
    return this.classService.createClass(createClassDto, user);
  }

  @Patch(':classId')
  async updateClass(
    @Body() updateClassDto: UpdateClassDto,
    @GetUser() user: User,
  ) {
    return this.classService.updateClass(updateClassDto, user);
  }

  @Delete(':classId')
  async deleteClass(@Param() params: DeleteClassDto, @GetUser() user: User) {
    return this.classService.deleteClass(params.classId, user);
  }
}
