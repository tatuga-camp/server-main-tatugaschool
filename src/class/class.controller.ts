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

@Controller('v1/class')
export class ClassController {
  constructor(private classService: ClassService) {}

  @Get(':classId')
  async getClassById(@Param() params: GetClassDto) {
    return this.classService.getClassById(params.id);
  }

  @Get()
  async getAllClasses() {
    return this.classService.getAllClasses();
  }

  @Get('pagination')
  async getClassesWithPagination(@Query() query: GetClassByPageDto) {
    const { page, limit } = query;
    return this.classService.getClassesWithPagination(page, limit);
  }

  @Post('reorder')
  async reorderClasses(@Body() reorderClassDto: ReorderClassDto) {
    return this.classService.reorderClasses(reorderClassDto);
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
  async deleteClass(@Param() params: DeleteClassDto) {
    return this.classService.deleteClass(params.id);
  }
}
