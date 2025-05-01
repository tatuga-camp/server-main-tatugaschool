import { ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

export class ReorderStudentOnGroupDto {
  @IsArray()
  @IsMongoId({ each: true })
  @ArrayMinSize(1)
  studentOnGroupIds: string[];
}
