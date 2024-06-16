import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
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

@Controller('v1/class')
export class ClassController {
  constructor(private classService: ClassService) {}

  @Get(':classId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getClassById(@Param() params: GetClassDto) {
    return this.classService.getClassById(params.id);
  }

  @Get()
  async getAllClasses() {
    return this.classService.getAllClasses();
  }

  @Get('pagination')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getClassesWithPagination(@Query() query: GetClassByPageDto) {
    const { page, limit } = query;
    return this.classService.getClassesWithPagination(page, limit);
  }

  @Post('reorder')
  @UsePipes(new ValidationPipe({ transform: true }))
  async reorderClasses(@Body() reorderClassDto: ReorderClassDto) {
    return this.classService.reorderClasses(reorderClassDto);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async createClass(@Body() createClassDto: CreateClassDto) {
    return this.classService.createClass(createClassDto);
  }

  @Patch(':classId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateClass(
    @Param() classId: UpdateClassDto['classId'],
    @Body() updateClassDto: UpdateClassDto,
  ) {
    return this.classService.updateClass(classId, updateClassDto);
  }

  @Delete(':classId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteClass(@Param() params: DeleteClassDto) {
    return this.classService.deleteClass(params.id);
  }
}
