import { Student, User } from '@prisma/client';
import { GetSignURLDto } from './dto';
import { GoogleStorageService } from './google-storage.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StudentGuard, UserGuard } from '../auth/guard';
import { GetStudent, GetUser } from '../auth/decorators';

@Controller('v1/google-storage')
export class GoogleStorageController {
  constructor(private googleStorageService: GoogleStorageService) {}

  @UseGuards(UserGuard)
  @Get('get-signURL/teacher')
  UserGetSignURL(@Query() dto: GetSignURLDto, @GetUser() user: User) {
    return this.googleStorageService.GetSignURL({
      userId: user.id,
      fileName: dto.fileName,
      fileType: dto.fileType,
    });
  }

  @UseGuards(StudentGuard)
  @Get('get-signURL/student')
  UserGetSignURLStudent(
    @Query() dto: GetSignURLDto,
    @GetStudent() student: Student,
  ) {
    return this.googleStorageService.GetSignURL({
      studentId: student.id,
      fileName: dto.fileName,
      fileType: dto.fileType,
    });
  }
}
