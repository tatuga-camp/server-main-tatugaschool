import {
  IsOptional,
  IsString,
  IsMongoId,
  IsDate,
  IsBoolean,
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTaskDtoBody {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDate()
  deadline?: Date;

  @IsOptional()
  @IsMongoId()
  assigneeId?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsMongoId()
  teamId?: string;

  @IsOptional()
  @IsMongoId()
  schoolId?: string;

  @IsOptional()
  @IsMongoId()
  boardId?: string;

  @IsOptional()
  @IsMongoId()
  columId?: string;
}

export class UpdateTaskDtoQuery {
  @IsNotEmpty()
  @IsMongoId()
  taskId: string;
}

export class UpdateTaskDto {
  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateTaskDtoQuery)
  query: UpdateTaskDtoQuery;

  @IsNotEmpty()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateTaskDtoBody)
  body: UpdateTaskDtoBody;
}
