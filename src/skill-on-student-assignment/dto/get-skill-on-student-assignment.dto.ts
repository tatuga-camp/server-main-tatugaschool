import { IsMongoId, IsNotEmpty } from 'class-validator';

export class GetByStudentIdDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}
