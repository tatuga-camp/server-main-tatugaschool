import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateStudentOnGroupDto {
  @IsNotEmpty()
  @IsMongoId()
  unitOnGroupId: string;

  @IsNotEmpty()
  @IsMongoId()
  studentOnSubjectId: string;
}
