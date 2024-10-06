import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(599)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(599)
  lastName?: string;

  @IsOptional()
  @IsUrl()
  photo?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}
