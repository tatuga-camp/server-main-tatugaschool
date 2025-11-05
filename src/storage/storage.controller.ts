import { Student, User } from '@prisma/client';
import { GetSignURLDto } from './dto';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StudentGuard, UserGuard } from '../auth/guard';
import { GetStudent, GetUser } from '../auth/decorators';
import { StorageService } from './storage.service';

@Controller('v1/google-storage')
export class StorageController {
  constructor(private StorageService: StorageService) {}

  @UseGuards(UserGuard)
  @Get('get-signURL/teacher')
  UserGetSignURL(@Query() dto: GetSignURLDto, @GetUser() user: User) {
    return this.StorageService.getUploadSignedUrl(
      {
        userId: user.id,
        schoolId: dto.schoolId,
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
      },
      user,
    );
  }

  @UseGuards(StudentGuard)
  @Get('get-signURL/student')
  UserGetSignURLStudent(
    @Query() dto: GetSignURLDto,
    @GetStudent() student: Student,
  ) {
    return this.StorageService.getUploadSignedUrl(
      {
        schoolId: dto.schoolId,
        fileName: dto.fileName,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
      },
      null,
      student,
    );
  }
}
