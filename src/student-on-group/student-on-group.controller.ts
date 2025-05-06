import { User } from '@prisma/client';
import { GetUser } from '../auth/decorators';
import {
  CreateStudentOnGroupDto,
  DeleteStudentOnGroupDto,
  ReorderStudentOnGroupDto,
  UpdateStudentOnGroupDto,
} from './dto';
import { StudentOnGroupService } from './student-on-group.service';
import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserGuard } from '../auth/guard';

@Controller('v1/student-on-groups')
export class StudentOnGroupController {
  constructor(private studentOnGroupService: StudentOnGroupService) {}

  @Post()
  @UseGuards(UserGuard)
  async create(@Body() dto: CreateStudentOnGroupDto, @GetUser() user: User) {
    return await this.studentOnGroupService.create(dto, user);
  }

  @Patch('reorder')
  @UseGuards(UserGuard)
  async reorder(@Body() dto: ReorderStudentOnGroupDto, @GetUser() user: User) {
    return await this.studentOnGroupService.reorder(dto, user);
  }

  @Patch()
  @UseGuards(UserGuard)
  async update(@Body() dto: UpdateStudentOnGroupDto, @GetUser() user: User) {
    return await this.studentOnGroupService.update(dto, user);
  }

  @Delete(':studentOnGroupId')
  @UseGuards(UserGuard)
  async delete(@Param() dto: DeleteStudentOnGroupDto, @GetUser() user: User) {
    return await this.studentOnGroupService.delete(dto, user);
  }
}
