import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'user-jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: FastifyRequest, payload: any) {
    const refreshToken = (req.headers.authorization ?? '')
      .replace('Bearer', '')
      .trim();
    return { ...payload, refreshToken };
  }
}

@Injectable()
export class StudentRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'student-jwt-refresh',
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('STUDENT_JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(req: FastifyRequest, payload: any) {
    const refreshToken = (req.headers.authorization ?? '')
      .replace('Bearer', '')
      .trim();
    return { ...payload, refreshToken };
  }
}
