import { Module } from '@nestjs/common';
import { SubjectService } from '../subject/subject.service';
import { FileAssignmentController } from './file-assignment.controller';
import { FileAssignmentService } from './file-assignment.service';
import { WheelOfNameService } from '../wheel-of-name/wheel-of-name.service';
import { AttendanceTableService } from '../attendance-table/attendance-table.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { ClassService } from '../class/class.service';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { SchoolService } from '../school/school.service';
import { HttpModule } from '@nestjs/axios';
import { StudentService } from '../student/student.service';

@Module({
  imports: [HttpModule],
  providers: [
    FileAssignmentService,
    SubjectService,
    WheelOfNameService,
    AttendanceTableService,
    TeacherOnSubjectService,
    ClassService,
    MemberOnSchoolService,
    SchoolService,
    StudentService,
  ],
  controllers: [FileAssignmentController],
})
export class FileAssignmentModule {}
