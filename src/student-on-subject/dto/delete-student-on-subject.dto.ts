import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteStudentOnSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;
}
