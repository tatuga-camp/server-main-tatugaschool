import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  app.use('/webhooks', bodyParser.raw({ type: 'application/json' }));
  app.use(bodyParser.json({ limit: '100mb' }));
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Determine the allowed origins
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

  const port = process.env.PORT || 3000;
  await app.listen(port, () => {
    logger.log(`Hello world listening on port : ${port}`);
    logger.log(`Allowed origins: ${allowedOrigins}`);
    logger.log(`Environment: ${process.env.NODE_ENV}`);
    logger.log('Node.js Version:', process.version);
  });
}

bootstrap();
