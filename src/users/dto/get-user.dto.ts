import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GetUserByEmailDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @MinLength(4)
  email: string;
}
