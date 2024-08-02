import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ImageService } from 'src/image/image.service';
import {
  StudentAccessTokenStrategy,
  StudentRefreshTokenStrategy,
  UserAccessTokenStrategy,
  UserRefreshTokenStrategy,
} from './strategy';
import { GoogleStrategy } from './strategy/google-oauth.strategy';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [
    AuthService,
    ImageService,
    UserAccessTokenStrategy,
    UserRefreshTokenStrategy,
    StudentAccessTokenStrategy,
    StudentRefreshTokenStrategy,
    GoogleStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
