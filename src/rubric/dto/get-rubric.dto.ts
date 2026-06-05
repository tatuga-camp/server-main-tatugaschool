import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetRubricsBySubjectDto {
  @IsNotEmpty() @IsMongoId() subjectId: string;
}
export class RubricIdParamDto {
  @IsNotEmpty() @IsMongoId() rubricId: string;
}
export class StudentOnAssignmentIdParamDto {
  @IsNotEmpty() @IsMongoId() studentOnAssignmentId: string;
}
