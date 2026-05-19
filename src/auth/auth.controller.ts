import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard } from './guard/google-oauth.guard';
import {
  ForgotPasswordDto,
  RefreshTokenDto,
  ResetPasswordDto,
  SignInDto,
  SignUpDto,
  StudentSignInDto,
  VerifyEmailDto,
} from './dto';

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('sign-up')
  signup(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return this.authService.signup(dto, reply);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<void> {
    await this.authService.verifyEmail(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.authService.resetPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return await this.authService.signIn(dto, reply);
  }

  @HttpCode(HttpStatus.OK)
  @Post('student/sign-in')
  async studentSignIn(
    @Body() dto: StudentSignInDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return await this.authService.studentSignIn(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-token')
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    return await this.authService.UserRefreshToken(dto, reply);
  }

  @HttpCode(HttpStatus.OK)
  @Post('student/refresh-token')
  async studentRefreshToken(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    return await this.authService.StudnetRefreshToken(dto);
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  async googleAuth() {}

  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  googleAuthRedirect(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.authService.googleLogin(req, reply);
  }
}
