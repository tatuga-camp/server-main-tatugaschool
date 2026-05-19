import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';

@Injectable()
export class StudentGuard extends createFastifyPassportGuard('student-jwt') {
  handleRequest(err: unknown, student: any): any {
    if (err || !student) throw new UnauthorizedException('Access denied');
    return student;
  }
}
