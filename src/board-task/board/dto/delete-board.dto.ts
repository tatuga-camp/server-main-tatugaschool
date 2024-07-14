import { IsNotEmpty, IsMongoId } from 'class-validator';

export class DeleteBoardDto {
  @IsNotEmpty()
  @IsMongoId()
  boardId: string;
}
