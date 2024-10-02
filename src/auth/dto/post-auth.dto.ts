import { Provider } from '@prisma/client';
import {
  IsEmail,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
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
  @IsPhoneNumber()
  phone: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(Object.values(Provider))
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

export class StudentSignInDto {
  @IsNotEmpty()
  @IsMongoId()
  studentId: string;

  @IsOptional()
  @IsString()
  password: string;
}
