import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { ReorderClassDto, UpdateClassDto } from './dto/update-class.dto';
import { GetClassByPageDto, GetClassDto } from './dto/get-class.dto';
import { DeleteClassDto } from './dto/delete-class.dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserGuard } from '../auth/guard';

@UseGuards(UserGuard)
@Controller('v1/classes')
export class ClassController {
  constructor(private classService: ClassService) {}

  @Get(':classId')
  async getClassById(@Param() params: GetClassDto, @GetUser() user: User) {
    return await this.classService.getClassById(params.classId, user);
  }

  @Get()
  async getClassesWithPagination(
    @Query() query: GetClassByPageDto,
    @GetUser() user: User,
  ) {
    const { page, limit, schoolId } = query;
    return await this.classService.getClassesWithPagination(
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
    return await this.classService.reorderClasses(reorderClassDto, user);
  }

  @Post()
  async createClass(
    @Body() createClassDto: CreateClassDto,
    @GetUser() user: User,
  ) {
    return await this.classService.createClass(createClassDto, user);
  }

  @Patch(':classId')
  async updateClass(
    @Body() updateClassDto: UpdateClassDto,
    @GetUser() user: User,
  ) {
    return await this.classService.updateClass(updateClassDto, user);
  }

  @Delete(':classId')
  async deleteClass(@Param() params: DeleteClassDto, @GetUser() user: User) {
    return await this.classService.deleteClass(params.classId, user);
  }
}
