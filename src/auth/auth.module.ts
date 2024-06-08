import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ImageService } from 'src/image/image.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AccessTokenStrategy, RefreshTokenStrategy } from './strategy';
import { GoogleStrategy } from './strategy/google-oauth.strategy';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '60s' },
        global: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    AuthService,
    ImageService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    UserRepository,
    GoogleStrategy,
    {
      provide: APP_GUARD,
      useClass: UserGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
