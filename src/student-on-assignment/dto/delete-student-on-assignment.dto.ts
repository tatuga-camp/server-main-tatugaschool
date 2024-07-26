import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteStudentOnAssignmentDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;
}
