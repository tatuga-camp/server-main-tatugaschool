import { IsMongoId, IsNotEmpty } from 'class-validator';

export class DeleteWordCloudDto {
  @IsNotEmpty()
  @IsMongoId()
  wordCloudId: string;
}
