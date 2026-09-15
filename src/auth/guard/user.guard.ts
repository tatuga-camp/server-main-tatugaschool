import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';
import { UserJwtPayload } from '../../interfaces/jwt-payload';

@Injectable()
export class UserGuard extends createFastifyPassportGuard('user-jwt') {
  handleRequest(err: unknown, user: UserJwtPayload): UserJwtPayload {
    if (err || !user) {
      throw new UnauthorizedException('Access denied');
    }
    if (!user.isVerifyEmail) {
      throw new ForbiddenException('Email not verified');
    }
    return user;
  }
}
