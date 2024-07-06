import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateStudentOnSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsNotEmpty()
  @IsMongoId()
  subjectId: string;
}
