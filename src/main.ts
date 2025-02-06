import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Determine the allowed origins
  const allowedOrigins = isDevelopment
    ? ['*', 'http://localhost:8181']
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
  });
}

bootstrap();
