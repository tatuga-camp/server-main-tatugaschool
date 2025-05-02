import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteStudentOnGroupDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnGroupId: string;
}
