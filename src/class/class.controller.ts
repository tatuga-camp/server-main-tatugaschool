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
import { DeleteClassDto } from './dto/delete-class.dto';
import { GetUser } from '../auth/decorators';
import { User } from '@prisma/client';
import { UserGuard } from '../auth/guard';
import {
  GetClassByClassIdDto,
  GetClassByQueryDto,
  GetClassBySchoolIdDto,
} from './dto';

@UseGuards(UserGuard)
@Controller('v1/classes')
export class ClassController {
  constructor(private classService: ClassService) {}

  @Get(':classId')
  async getClassById(
    @Param() dto: GetClassByClassIdDto,
    @GetUser() user: User,
  ) {
    return await this.classService.getById(dto, user);
  }

  @Get('school/:schoolId')
  getClassBySchool(
    @Param() param: GetClassBySchoolIdDto,
    @Query() query: GetClassByQueryDto,
    @GetUser() user: User,
  ) {
    return this.classService.getBySchool(
      { schoolId: param.schoolId, isAchieved: query.isAchieved },
      user,
    );
  }

  @Patch('reorder')
  async reorderClasses(
    @Body() reorderClassDto: ReorderClassDto,
    @GetUser() user: User,
  ) {
    return await this.classService.reorder(reorderClassDto, user);
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
    return await this.classService.update(updateClassDto, user);
  }

  @Delete(':classId')
  async deleteClass(@Param() dto: DeleteClassDto, @GetUser() user: User) {
    return await this.classService.delete(dto, user);
  }
}
