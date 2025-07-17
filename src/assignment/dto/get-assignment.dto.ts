import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetAssignmentByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}

export class GetAssignmentBySubjectIdDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}

export class GetAssignmentOverviewByStudentOnSubjectId {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}
export class GetAssignmentExportExcelDto {
  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
