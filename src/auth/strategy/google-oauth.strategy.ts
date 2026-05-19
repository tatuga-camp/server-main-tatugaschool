import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@prisma/client';
import { Strategy, VerifyCallback } from 'passport-google-oauth2';
import fastifyPassport from '@fastify/passport';

export type GoogleProfile = {
  provider: Provider;
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  photo: string;
  phone: string;
};

@Injectable()
export class GoogleStrategy implements OnModuleInit {
  constructor(private config: ConfigService) {}

  onModuleInit() {
    fastifyPassport.use(
      'google',
      new Strategy(
        {
          clientID: this.config.get('GOOGLE_CLIENT_ID'),
          clientSecret: this.config.get('GOOGLE_CLIENT_SECRET'),
          callbackURL: this.config.get('GOOGLE_CALL_BACK'),
          scope: ['profile', 'email'],
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: any,
          done: VerifyCallback,
        ) => {
          const { id, name, emails, photos } = profile;
          if (!emails?.length) {
            return done(
              new UnauthorizedException('Google account has no email'),
              null,
            );
          }
          const user: GoogleProfile = {
            provider: Provider.GOOGLE,
            providerId: id,
            email: emails[0].value,
            firstName: name?.givenName ?? '',
            lastName: name?.familyName ?? '',
            photo: photos?.[0]?.value ?? '',
            phone: '',
          };
          done(null, user);
        },
      ),
    );
  }
}
