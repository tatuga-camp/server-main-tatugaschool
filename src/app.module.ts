import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { EmailModule } from './email/email.module';
import { ConfigModule } from '@nestjs/config';
import { GoogleStorageModule } from './google-storage/google-storage.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    EmailModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GoogleStorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
