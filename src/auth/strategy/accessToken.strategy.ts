import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import fastifyPassport from '@fastify/passport';
import {
  StudentJwtPayload,
  UserJwtPayload,
} from '../../interfaces/jwt-payload';

@Injectable()
export class UserAccessTokenStrategy implements OnModuleInit {
  private readonly logger = new Logger(UserAccessTokenStrategy.name);
  constructor(private config: ConfigService) {}

  onModuleInit() {
    fastifyPassport.use(
      'user-jwt',
      new Strategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKey: this.config.get('JWT_ACCESS_SECRET'),
        },
        (payload: UserJwtPayload, done) => {
          try {
            done(null, payload);
          } catch (err) {
            this.logger.error(err);
            done(new UnauthorizedException(), false);
          }
        },
      ),
    );
  }
}

@Injectable()
export class StudentAccessTokenStrategy implements OnModuleInit {
  private readonly logger = new Logger(StudentAccessTokenStrategy.name);
  constructor(private config: ConfigService) {}

  onModuleInit() {
    fastifyPassport.use(
      'student-jwt',
      new Strategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKey: this.config.get('STUDENT_JWT_ACCESS_SECRET'),
        },
        (payload: StudentJwtPayload, done) => {
          try {
            done(null, payload);
          } catch (err) {
            this.logger.error(err);
            done(new UnauthorizedException(), false);
          }
        },
      ),
    );
  }
}
