import { IsNotEmpty, IsMongoId } from 'class-validator';

export class DeleteTaskDto {
  @IsNotEmpty()
  @IsMongoId()
  taskId: string;
}
