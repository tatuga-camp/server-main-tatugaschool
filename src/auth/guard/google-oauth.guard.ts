import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';

@Injectable()
export class GoogleOAuthGuard extends createFastifyPassportGuard('google', {
  session: false,
  scope: ['profile', 'email'],
}) {
  handleRequest(err: unknown, user: any): any {
    if (err || !user) {
      throw new UnauthorizedException('Google authentication failed');
    }
    return user;
  }
}
