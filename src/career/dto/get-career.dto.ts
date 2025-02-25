import { Transform } from 'class-transformer';
import { IsMongoId, IsNotEmpty, IsNumber } from 'class-validator';

export class GetCarrerById {
  @IsNotEmpty()
  @IsMongoId()
  careerId: string;
}

export class GetSuggestDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;
}
