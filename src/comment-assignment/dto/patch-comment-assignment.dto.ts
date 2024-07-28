import { Type } from 'class-transformer';
import {
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class UpdateCommentOnAssignmentQuery {
  @IsNotEmpty()
  @IsMongoId()
  commentOnAssignmentId: string;
}

class UpdateCommentOnAssignmentBody {
  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateCommentOnAssignmentDto {
  @IsObject()
  @IsNotEmpty()
  @Type(() => UpdateCommentOnAssignmentQuery)
  @ValidateNested()
  query: UpdateCommentOnAssignmentQuery;

  @IsObject()
  @IsNotEmpty()
  @Type(() => UpdateCommentOnAssignmentBody)
  @ValidateNested()
  body: UpdateCommentOnAssignmentBody;
}
