import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetFileOnStudentAssignmentByStudentOnAssignmentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentOnAssignmentId: string;
}
