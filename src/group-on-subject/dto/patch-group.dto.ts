import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

class UpdateGroupOnSubjectQuery {
  @IsNotEmpty()
  @IsMongoId()
  groupOnSubjectId: string;
}

class UpdateGroupOnSubjectBody {
  @IsOptional()
  @IsString()
  @MaxLength(599)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(599)
  description?: string;
}

export class UpdateGroupOnSubjectDto {
  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateGroupOnSubjectQuery)
  @ValidateNested()
  query: UpdateGroupOnSubjectQuery;

  @IsNotEmpty()
  @IsObject()
  @Type(() => UpdateGroupOnSubjectBody)
  @ValidateNested()
  body: UpdateGroupOnSubjectBody;
}
