import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyPassport from '@fastify/passport';
import fastifySecureSession from '@fastify/secure-session';
import pino from 'pino';
import { AppModule } from './app.module';
import { PinoLoggerService } from './common/logger/pino-logger.service';
import { PRODUCTION_CORS_ORIGINS } from './cors-config';

function buildLoggerConfig() {
  const env = process.env.NODE_ENV;
  if (env === 'test') return false as const;

  const isProduction = env === 'production';

  return {
    level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["set-cookie"]',
        'res.headers["set-cookie"]',
      ],
      remove: true,
    },
    // transport intentionally omitted:
    //  - production: direct synchronous stdout, single-line JSON, no worker threads
    //  - avoids Bun + pino worker-thread compatibility risks
  };
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 100 * 1024 * 1024,
      trustProxy: true,
      routerOptions: {
        ignoreTrailingSlash: true,
      },
      logger: buildLoggerConfig(),
      disableRequestLogging: true,
    }),
    { rawBody: true, bufferLogs: true },
  );

  // Install the bridge BEFORE app.listen() / any module initialization-time
  // logging so that bufferLogs flushes into pino instead of the default Nest
  // logger.
  const fastifyInstance = app.getHttpAdapter().getInstance();
  app.useLogger(new PinoLoggerService(fastifyInstance.log));

  await app.register(fastifyCookie);

  // @fastify/passport requires a session plugin even for stateless JWT flows.
  // We use secure-session with a key derived from JWT_REFRESH_SECRET — never
  // actually used because every strategy passes { session: false }, but the
  // API contract demands registration.
  const sessionKey = Buffer.alloc(32);
  Buffer.from(process.env.JWT_REFRESH_SECRET ?? 'dev-fallback')
    .copy(sessionKey, 0, 0, 32);
  await app.register(fastifySecureSession, {
    key: sessionKey,
    cookie: { path: '/', secure: true, sameSite: 'none' },
  });
  await app.register(fastifyPassport.initialize());
  await app.register(fastifyPassport.secureSession());

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
