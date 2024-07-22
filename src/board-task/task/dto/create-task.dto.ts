import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
  IsDate,
} from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDate()
  deadline?: Date;

  @IsNotEmpty()
  @IsMongoId()
  assigneeId: string;

  @IsNotEmpty()
  @IsMongoId()
  teamId: string;

  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;

  @IsNotEmpty()
  @IsMongoId()
  boardId: string;

  @IsNotEmpty()
  @IsMongoId()
  columId: string;
}
