import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteTeacherOnSubjectDto {
  @IsNotEmpty()
  @IsMongoId()
  teacherOnSubjectId: string;
}
