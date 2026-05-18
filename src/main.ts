import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 100 * 1024 * 1024,
      trustProxy: true,
    }),
    { rawBody: true },
  );

  await app.register(fastifyCookie);

  const isDevelopment = process.env.NODE_ENV !== 'production';

  const allowedOrigins = isDevelopment
    ? true
    : [
        'https://tatugaschool.com',
        'https://www.tatugaschool.com',
        'https://app.tatugaschool.com',
        'https://student.tatugaschool.com',
      ];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const logger = new Logger('NestApplication');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Hello world listening on port : ${port}`);
  logger.log(`Allowed origins: ${allowedOrigins}`);
  logger.log(`Environment: ${process.env.NODE_ENV}`);

  const isBun = typeof Bun !== 'undefined';
  logger.log(`Runtime: ${isBun ? 'Bun' : 'Node.js'}`);
  logger.log(`Version: ${isBun ? Bun.version : process.version}`);
}

bootstrap();
