import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteSchoolDto {
  @IsNotEmpty()
  @IsMongoId()
  schoolId: string;
}
