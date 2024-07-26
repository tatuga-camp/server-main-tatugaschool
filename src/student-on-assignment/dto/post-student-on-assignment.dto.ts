import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateStudentOnAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;

  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}
