import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class GetStudentDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  studentId: string;
}

export class GetAllStudentsDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  classId: string;
}
