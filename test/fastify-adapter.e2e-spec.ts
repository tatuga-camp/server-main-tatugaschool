import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { PrismaReadService } from '../src/prisma/prisma-read.service';
import { RedisService } from '../src/redis/redis.service';
import { StorageService } from '../src/storage/storage.service';
import { StripeService } from '../src/stripe/stripe.service';
import { EmailService } from '../src/email/email.service';
import { AuthService } from '../src/auth/auth.service';
import { FileOnStudentAssignmentService } from '../src/file-on-student-assignment/file-on-student-assignment.service';
import { WebhooksService } from '../src/webhooks/webhooks.service';
import { UserGuard } from '../src/auth/guard';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('Fastify adapter (e2e)', () => {
  let app: NestFastifyApplication;

  const mockPrisma = {} as any;
  const mockRedis = {} as any;
  const mockStorage = {} as any;
  const mockStripe = {
    webhooks: { constructEvent: jest.fn() },
  };
  const mockEmail = {};

  const mockAuth = {
    signIn: jest.fn(),
    signup: jest.fn(),
    UserRefreshToken: jest.fn(),
    googleLogin: jest.fn(),
    studentSignIn: jest.fn(),
    StudnetRefreshToken: jest.fn(),
    forgotPassword: jest.fn(),
    verifyEmail: jest.fn(),
    resetPassword: jest.fn(),
  } as any;
  const mockFileOnStudent = {
    downloadAllFiles: jest.fn(),
  } as any;
  const mockWebhooks = {
    handleStripeWebhook: jest.fn(),
    handleLineWebhook: jest.fn(),
  } as any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService).useValue(mockPrisma)
      .overrideProvider(PrismaReadService).useValue(mockPrisma)
      .overrideProvider(RedisService).useValue(mockRedis)
      .overrideProvider(StorageService).useValue(mockStorage)
      .overrideProvider(StripeService).useValue(mockStripe)
      .overrideProvider(EmailService).useValue(mockEmail)
      .overrideProvider(AuthService).useValue(mockAuth)
      .overrideProvider(FileOnStudentAssignmentService).useValue(mockFileOnStudent)
      .overrideProvider(WebhooksService).useValue(mockWebhooks)
      .overrideGuard(UserGuard).useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard('google')).useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req: any = ctx.switchToHttp().getRequest();
          req.user = {
            email: 'g@example.com',
            firstName: 'G',
            lastName: 'X',
            providerId: 'gid',
            photo: 'p',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        bodyLimit: 100 * 1024 * 1024,
        trustProxy: true,
      }),
      { rawBody: true },
    );
    await app.register(fastifyCookie);
    app.enableCors({
      origin: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('boots', () => {
    expect(app).toBeDefined();
  });

  it('GET / returns welcome JSON', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).message).toMatch(/welcome to tatuga school/i);
  });

  it('OPTIONS preflight returns CORS headers', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/sign-in',
      headers: {
        origin: 'https://app.tatugaschool.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(res.statusCode).toBeLessThan(300);
    expect(res.headers['access-control-allow-origin']).toBeTruthy();
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('POST /webhooks/stripe forwards rawBody to the service', async () => {
    // Stripe sends JSON bodies. We use a valid JSON payload to avoid Fastify's
    // JSON parse rejection, while verifying rawBody is preserved as a Buffer.
    const stripePayload = '{"type":"payment_intent.succeeded","data":{}}';
    mockWebhooks.handleStripeWebhook.mockImplementation(async (req: any, reply: any) => {
      expect(Buffer.isBuffer(req.rawBody)).toBe(true);
      expect(req.rawBody.toString('utf8')).toBe(stripePayload);
      expect(req.headers['stripe-signature']).toBe('test-sig');
      reply.status(200).send({ ok: true });
    });

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/stripe',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'test-sig',
      },
      payload: stripePayload,
    });

    expect(res.statusCode).toBe(200);
    expect(mockWebhooks.handleStripeWebhook).toHaveBeenCalled();
  });

  it('POST /webhooks/line rejects bad signature and accepts good one', async () => {
    process.env.LINE_CHANNEL_SECRET = 'line-secret';
    const payload = JSON.stringify({ events: [] });

    const badRes = await app.inject({
      method: 'POST',
      url: '/webhooks/line',
      headers: { 'content-type': 'application/json', 'x-line-signature': 'bad' },
      payload,
    });
    expect(badRes.statusCode).toBe(401);

    const crypto = await import('crypto');
    const goodSig = crypto
      .createHmac('sha256', 'line-secret')
      .update(payload)
      .digest('base64');

    mockWebhooks.handleLineWebhook.mockResolvedValue(undefined);
    const goodRes = await app.inject({
      method: 'POST',
      url: '/webhooks/line',
      headers: { 'content-type': 'application/json', 'x-line-signature': goodSig },
      payload,
    });
    expect(goodRes.statusCode).toBe(200);
    expect(goodRes.payload).toBe('OK');
  });

  it('POST /v1/auth/sign-in sets cookies with Max-Age in seconds', async () => {
    mockAuth.signIn.mockImplementation(async (_dto: any, reply: any) => {
      reply.setCookie('access_token', 'a', {
        maxAge: 60 * 60 * 24 * 3,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      reply.setCookie('refresh_token', 'r', {
        maxAge: 60 * 60 * 24 * 3,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      return { redirectUrl: 'https://x', accessToken: 'a', refreshToken: 'r' };
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      headers: { 'content-type': 'application/json' },
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(200);
    const setCookies = res.headers['set-cookie'];
    const cookieArr = Array.isArray(setCookies) ? setCookies : [setCookies];
    const joined = cookieArr.join('\n');
    expect(joined).toMatch(/access_token=a/);
    expect(joined).toMatch(/refresh_token=r/);
    expect(joined).toMatch(/Max-Age=259200/);
    expect(joined).toMatch(/Secure/);
    expect(joined).toMatch(/SameSite=None/);
  });

  it('GET /v1/auth/google/redirect returns 302 with Location', async () => {
    // Note: NestJS calls reply.code(200) before the handler runs (setStatus hook).
    // Fastify 5's reply.redirect(url) without explicit code uses the previously set code.
    // We must pass the explicit 302 status to override NestJS's pre-set 200.
    mockAuth.googleLogin.mockImplementation((_req: any, reply: any) => {
      reply.redirect('https://app.tatugaschool.com/', 302);
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/google/redirect',
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toBe('https://app.tatugaschool.com/');
  });

  it('POST /v1/file-on-student-assignments/download-all streams a zip', async () => {
    const archiver = await import('archiver');
    const archive = archiver.default('zip');
    archive.append('hello world', { name: 'a.txt' });
    archive.finalize();
    mockFileOnStudent.downloadAllFiles.mockResolvedValue(archive);

    const res = await app.inject({
      method: 'POST',
      url: '/v1/file-on-student-assignments/download-all',
      headers: { 'content-type': 'application/json' },
      payload: { assignmentId: '507f1f77bcf86cd799439011' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="assignments.zip"/,
    );
    expect(res.headers['content-type']).toMatch(/application\/zip/);
    const buf = res.rawPayload;
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('POST with >100 MB body returns 413', async () => {
    const big = Buffer.alloc(100 * 1024 * 1024 + 1024, 0x61);
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      headers: { 'content-type': 'application/json' },
      payload: big,
    });
    expect(res.statusCode).toBe(413);
  }, 30000);
});
