import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class UserGuard extends AuthGuard('user-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('Access denied');
    } else if (user.isVerifyEmail === false) {
      throw new ForbiddenException('Email not verified');
    } else {
      return user;
    }
  }
}
