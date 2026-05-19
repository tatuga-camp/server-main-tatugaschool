import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';
import { PRODUCTION_CORS_ORIGINS } from './cors-config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 100 * 1024 * 1024,
      trustProxy: true,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: true,
    }),
    { rawBody: true },
  );

  await app.register(fastifyCookie);

  // Override Fastify's default JSON parser to accept empty bodies.
  // useBodyParser sets _isParserRegistered = true, preventing NestJS from
  // re-registering its own parser during app.init() / app.listen().
  // We also register urlencoded manually since we're taking over parser setup.
  const adapter = app.getHttpAdapter() as any;
  adapter.registerUrlencodedContentParser(true);
  adapter.useBodyParser(
    'application/json',
    true,
    {},
    (
      req: any,
      body: Buffer,
      done: (err: Error | null, body?: unknown) => void,
    ) => {
      if (!body || body.length === 0) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(body.toString('utf8')));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  const isDevelopment = process.env.NODE_ENV !== 'production';

  const allowedOrigins = isDevelopment ? true : PRODUCTION_CORS_ORIGINS;

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
