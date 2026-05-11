import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Student, User } from '@prisma/client';

@Injectable()
export class UserAccessTokenStrategy extends PassportStrategy(
  Strategy,
  'user-jwt',
) {
  logger: Logger;
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
    this.logger = new Logger(UserAccessTokenStrategy.name);
  }

  async validate(payload: { id: string }) {
    try {
      return payload;
    } catch (err) {
      this.logger.error(err);
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class StudentAccessTokenStrategy extends PassportStrategy(
  Strategy,
  'student-jwt',
) {
  logger: Logger;
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('STUDENT_JWT_ACCESS_SECRET'),
    });
    this.logger = new Logger(UserAccessTokenStrategy.name);
  }

  async validate(payload: Student) {
    try {
      return payload;
    } catch (err) {
      this.logger.error(err);
      throw new UnauthorizedException();
    }
  }
}
