import { Global, Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ImageService } from '../image/image.service';
import {
  StudentAccessTokenStrategy,
  StudentRefreshTokenStrategy,
  UserAccessTokenStrategy,
  UserRefreshTokenStrategy,
} from './strategy';
import { GoogleStrategy } from './strategy/google-oauth.strategy';
import { SchoolModule } from '../school/school.module';

@Global()
@Module({
  imports: [JwtModule.register({}), forwardRef(() => SchoolModule)],
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
