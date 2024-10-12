import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsMongoId,
  IsDate,
  IsDateString,
} from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline?: Date;

  @IsNotEmpty()
  @IsMongoId()
  assigneeId: string;

  @IsNotEmpty()
  @IsMongoId()
  columId: string;
}
