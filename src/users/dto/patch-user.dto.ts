import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

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
  @IsString()
  blurHash?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
