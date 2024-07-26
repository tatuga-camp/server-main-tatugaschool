import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class StudentGuard extends AuthGuard('student-jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, student, info) {
    if (err || !student) {
      throw new ForbiddenException('Access denied');
    } else {
      return student;
    }
  }
}
