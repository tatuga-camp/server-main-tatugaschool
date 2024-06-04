import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string): Promise<void> {
    await this.authService.forgotPassword(email);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('sign-up')
  async signup(
    @Body()
    data: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
    },
  ): Promise<void> {
    await this.authService.signup(data);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body('token') token: string): Promise<void> {
    await this.authService.verifyEmail(token);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forget-password')
  async forgetPassword(@Body('email') email: string): Promise<void> {
    await this.authService.forgotPassword(email);
  }
}
