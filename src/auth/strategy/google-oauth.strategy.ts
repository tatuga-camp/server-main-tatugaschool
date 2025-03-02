import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Provider } from '@prisma/client';
import { Strategy, VerifyCallback } from 'passport-google-oauth2';

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
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID'),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.get('GOOGLE_CALL_BACK'),
      scope: ['profile', 'email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    if (!emails || !emails.length) {
      throw new UnauthorizedException('Google account does not have an email.');
    }

    const user: GoogleProfile = {
      provider: Provider.GOOGLE,
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName ?? '',
      lastName: name.familyName ?? '',
      photo: photos[0].value,
      phone: '',
    };

    done(null, user);
  }
}
