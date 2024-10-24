import { ArrayMinSize, IsArray, IsMongoId, IsNotEmpty } from 'class-validator';

export class SortDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  studentOnSubjectIds: string[];
}
