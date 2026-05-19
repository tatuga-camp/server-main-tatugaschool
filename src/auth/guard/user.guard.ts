import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';

@Injectable()
export class UserGuard extends createFastifyPassportGuard('user-jwt') {
  handleRequest(err: unknown, user: any): any {
    if (err || !user) {
      throw new UnauthorizedException('Access denied');
    }
    if (user.isVerifyEmail === false) {
      throw new ForbiddenException('Email not verified');
    }
    return user;
  }
}
