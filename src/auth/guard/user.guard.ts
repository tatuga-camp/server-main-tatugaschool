import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';
import { UserJwtPayload } from '../../interfaces/jwt-payload';

@Injectable()
export class UserGuard extends createFastifyPassportGuard('user-jwt') {
  handleRequest(err: unknown, user: UserJwtPayload): any {
    if (err || !user) {
      throw new UnauthorizedException('Access denied');
    }
    return user;
  }
}
