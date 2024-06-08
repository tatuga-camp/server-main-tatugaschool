import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  SignInDto,
  SignUpDto,
  VerifyEmailDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('sign-up')
  async signup(
    @Body()
    signUpDto: SignUpDto,
  ): Promise<void> {
    await this.authService.signup(signUpDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: ForgotPasswordDto['email'],
  ): Promise<void> {
    await this.authService.forgotPassword(email);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(
    @Body('token') token: VerifyEmailDto['token'],
  ): Promise<void> {
    await this.authService.verifyEmail(token);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Patch('reset-password')
  async resetPassword(
    @Body('token') token: ResetPasswordDto['token'],
    @Body('password') password: ResetPasswordDto['password'],
  ): Promise<void> {
    await this.authService.resetPassword(token, password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(
    @Body('email') email: SignInDto['email'],
    @Body('password') password: SignInDto['password'],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return await this.authService.signIn(email, password);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  async refreshToken(
    @Body('refreshToken') refreshToken: RefreshTokenDto['refreshToken'],
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return await this.authService.refreshToken(refreshToken);
  }

  @Get('me')
  getProfile(@Request() req) {
    return req.user;
  }
}
