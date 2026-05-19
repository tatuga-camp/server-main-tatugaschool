import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import {
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Injectable,
  Module,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import fastifyPassport from '@fastify/passport';
import fastifySecureSession from '@fastify/secure-session';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import * as jwt from 'jsonwebtoken';

const SECRET = 'spike-secret';

@Injectable()
class SpikeJwtGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse();
    return new Promise((resolve, reject) => {
      const hook = fastifyPassport.authenticate(
        'spike-jwt',
        { session: false },
        async (_req, _reply, err, user) => {
          if (err || !user) return reject(new UnauthorizedException());
          (req as any).user = user;
          resolve(true);
        },
      );
      Promise.resolve((hook as any)(req, reply)).catch(reject);
    });
  }
}

@Controller()
class SpikeController {
  @Get('/protected')
  @UseGuards(SpikeJwtGuard)
  protected(@Req() req: FastifyRequest) {
    return { ok: true, user: (req as any).user };
  }
}

@Module({ controllers: [SpikeController] })
class SpikeModule {}

describe('fastify-passport spike', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SpikeModule],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    const fastify = app.getHttpAdapter().getInstance();
    await fastify.register(fastifySecureSession, {
      key: Buffer.alloc(32, 'a'),
      cookie: { path: '/' },
    });
    await fastify.register(fastifyPassport.initialize());
    await fastify.register(fastifyPassport.secureSession());
    fastifyPassport.use(
      'spike-jwt',
      new JwtStrategy(
        {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          secretOrKey: SECRET,
        },
        (payload, done) => done(null, payload),
      ),
    );
    await app.init();
    await fastify.ready();
  });

  afterAll(async () => app.close());

  it('valid JWT populates request.user', async () => {
    const token = jwt.sign({ id: 'u1' }, SECRET);
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).user.id).toBe('u1');
  });

  it('missing JWT returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/protected' });
    expect(res.statusCode).toBe(401);
  });

  it('invalid JWT returns 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer not.a.jwt' },
    });
    expect(res.statusCode).toBe(401);
  });
});
