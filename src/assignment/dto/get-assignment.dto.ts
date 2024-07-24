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
