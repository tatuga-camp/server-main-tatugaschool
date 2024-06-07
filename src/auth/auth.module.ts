import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { APP_GUARD } from '@nestjs/core';
import { UserGuard } from './guard/user.guard';
import { EmailModule } from 'src/email/email.module';
import { AccessTokenStrategy } from './strategy/accessToken.strategy';
import { RefreshTokenStrategy } from './strategy/refreshToken.strategy';
import { UserRepository } from 'src/users/users.repository';
import { ImageService } from 'src/image/image.service';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.accessTokenSecret,
      signOptions: { expiresIn: '60s' },
    }),
  ],
  providers: [
    AuthService,
    ImageService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    UserRepository,
    {
      provide: APP_GUARD,
      useClass: UserGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
