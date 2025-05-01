import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteUnitOnGroupDto {
  @IsNotEmpty()
  @IsMongoId()
  unitOnGroupId: string;
}
