import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class DeleteClassDto {
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  classId: string;
}
