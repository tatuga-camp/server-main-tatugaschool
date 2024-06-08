import { Provider } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignUpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @MaxLength(255)
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  lastName: string;

  @IsNotEmpty()
  @IsPhoneNumber('TH', { message: 'หมายเลขโทรศัพท์ไม่ถูกต้องในประเทศไทย' })
  phone: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['LOCAL', 'GOOGLE'])
  provider: Provider;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SignInDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class FindByEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
export class UpdateResetTokenDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsString()
  @IsNotEmpty()
  token: string;
  @IsNotEmpty()
  expiration: Date;
}

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  firstName: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  lastName: string;

  @IsNotEmpty()
  @IsPhoneNumber('TH', { message: 'หมายเลขโทรศัพท์ไม่ถูกต้องในประเทศไทย' })
  phone: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['LOCAL', 'GOOGLE'])
  provider: Provider;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  expiration: Date;
}

export class FindByVerifyTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class UpdateVerifiedDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class FindByResetTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class UpdatePasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @IsString()
  @IsNotEmpty()
  password: string;
}
export class UpdateLastActiveAtDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
