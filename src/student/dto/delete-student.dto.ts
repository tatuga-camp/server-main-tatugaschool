import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class DeleteStudentDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  id: string;
}
