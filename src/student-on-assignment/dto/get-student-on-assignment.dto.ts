import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetStudentOnAssignmentByAssignmentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  assignmentId: string;
}

export class GetStudentOnAssignmentByStudentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}

export class GetByIdDto {
  @IsNotEmpty()
  @IsMongoId()
  id: string;
}
