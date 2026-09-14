import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';
import { UserJwtPayload } from '../../interfaces/jwt-payload';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserGuard extends createFastifyPassportGuard('user-jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async handleRequest(
    err: unknown,
    user: UserJwtPayload,
  ): Promise<UserJwtPayload> {
    if (err || !user) {
      throw new UnauthorizedException('Access denied');
    }
    const record = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isVerifyEmail: true },
    });
    if (!record) {
      throw new UnauthorizedException('Access denied');
    }
    if (!record.isVerifyEmail) {
      throw new ForbiddenException('Email not verified');
    }
    return user;
  }
}
