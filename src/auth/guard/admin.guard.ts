import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from '@prisma/client';

@Injectable()
export class AdminGuard extends AuthGuard('user-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw new ForbiddenException('Access denied');
    }
    if (user.role === 'ADMIN') {
      return user;
    } else {
      throw new ForbiddenException('Access denied');
    }
  }
}
