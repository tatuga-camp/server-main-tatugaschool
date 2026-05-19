import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';

@Injectable()
export class NoVerifyUserGuard extends createFastifyPassportGuard('user-jwt') {
  handleRequest(err: unknown, user: any): any {
    if (err || !user) throw new UnauthorizedException('Access denied');
    return user;
  }
}
