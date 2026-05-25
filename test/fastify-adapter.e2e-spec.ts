import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyPassport from '@fastify/passport';
import fastifySecureSession from '@fastify/secure-session';
import { ExecutionContext, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
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
import { GoogleOAuthGuard } from '../src/auth/guard/google-oauth.guard';
import { SchoolService } from '../src/school/school.service';
import { PRODUCTION_CORS_ORIGINS } from '../src/cors-config';

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
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn().mockImplementation(() => ({
        getClient: jest.fn(),
      })),
    },
  },
}));

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
const mockSchool = {
  deleteSchool: jest.fn().mockResolvedValue({ ok: true }),
} as any;

type BuildAppOptions = {
  corsOrigin: boolean | string[];
  realAuth?: boolean;
  realGoogleGuard?: boolean;
  realUserGuard?: boolean;
  googleGuardUser?: any;
  prisma?: any;
  jwt?: any;
  config?: any;
};

async function buildApp(
  opts: BuildAppOptions,
): Promise<NestFastifyApplication> {
  const prismaOverride = opts.prisma ?? mockPrisma;
  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaOverride)
    .overrideProvider(PrismaReadService)
    .useValue(prismaOverride)
    .overrideProvider(RedisService)
    .useValue(mockRedis)
    .overrideProvider(StorageService)
    .useValue(mockStorage)
    .overrideProvider(StripeService)
    .useValue(mockStripe)
    .overrideProvider(EmailService)
    .useValue(mockEmail)
    .overrideProvider(FileOnStudentAssignmentService)
    .useValue(mockFileOnStudent)
    .overrideProvider(WebhooksService)
    .useValue(mockWebhooks)
    .overrideProvider(SchoolService)
    .useValue(mockSchool);

  if (!opts.realAuth) {
    builder = builder.overrideProvider(AuthService).useValue(mockAuth);
  }
  if (opts.jwt)
    builder = builder.overrideProvider(JwtService).useValue(opts.jwt);
  if (opts.config)
    builder = builder.overrideProvider(ConfigService).useValue(opts.config);

  let guardedBuilder = builder;
  if (!opts.realUserGuard) {
    guardedBuilder = guardedBuilder.overrideGuard(UserGuard).useValue({
      canActivate: () => true,
    });
  }
  if (!opts.realGoogleGuard) {
    guardedBuilder = guardedBuilder.overrideGuard(GoogleOAuthGuard).useValue({
      canActivate: (ctx: ExecutionContext) => {
        const req: any = ctx.switchToHttp().getRequest();
        req.user = opts.googleGuardUser ?? {
          email: 'g@example.com',
          firstName: 'G',
          lastName: 'X',
          providerId: 'gid',
          photo: 'p',
        };
        return true;
      },
    });
  }
  const moduleRef: TestingModule = await guardedBuilder.compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({
      bodyLimit: 100 * 1024 * 1024,
      trustProxy: true,
      ignoreTrailingSlash: true,
      ignoreDuplicateSlashes: true,
    }),
    { rawBody: true },
  );
  await app.register(fastifyCookie);

  const fastifyInstance = app.getHttpAdapter().getInstance();
  const sessionKey = Buffer.alloc(32, 'a');
  await fastifyInstance.register(fastifySecureSession, {
    key: sessionKey,
    cookie: { path: '/' },
  });
  await fastifyInstance.register(fastifyPassport.initialize());
  await fastifyInstance.register(fastifyPassport.secureSession());

  const adapter = app.getHttpAdapter() as any;
  adapter.registerUrlencodedContentParser(true);
  adapter.useBodyParser(
    'application/json',
    true,
    {},
    (
      _req: any,
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

  app.enableCors({
    origin: opts.corsOrigin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('Fastify adapter (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await buildApp({ corsOrigin: true });
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
    expect(JSON.parse(res.payload).message).toMatch(
      /welcome to tatuga school/i,
    );
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
    const stripePayload = '{"type":"payment_intent.succeeded","data":{}}';
    mockWebhooks.handleStripeWebhook.mockImplementation(
      async (req: any, reply: any) => {
        expect(Buffer.isBuffer(req.rawBody)).toBe(true);
        expect(req.rawBody.toString('utf8')).toBe(stripePayload);
        expect(req.headers['stripe-signature']).toBe('test-sig');
        reply.status(200).send({ ok: true });
      },
    );

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
      headers: {
        'content-type': 'application/json',
        'x-line-signature': 'bad',
      },
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
      headers: {
        'content-type': 'application/json',
        'x-line-signature': goodSig,
      },
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

  it('DELETE with Content-Type application/json and no body is not rejected', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/schools/507f1f77bcf86cd799439011',
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).not.toBe(400);
  });

  it('trailing-slash and duplicate-slash URLs match the no-slash route', async () => {
    // Clients send URLs like `/v1/auth/sign-in/` (schools.ts, subject.ts,
    // attendance.ts, assignments.ts, group-on-subject.ts, attendance-row.ts).
    // Fastify defaults to strict matching, so we must keep ignoreTrailingSlash +
    // ignoreDuplicateSlashes enabled. This test locks that behavior in.
    mockAuth.signIn.mockResolvedValue({
      redirectUrl: 'x',
      accessToken: 'a',
      refreshToken: 'r',
    });

    const noSlash = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      headers: { 'content-type': 'application/json' },
      payload: { email: 'test@example.com', password: 'password123' },
    });
    const trailing = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in/',
      headers: { 'content-type': 'application/json' },
      payload: { email: 'test@example.com', password: 'password123' },
    });
    const duplicate = await app.inject({
      method: 'POST',
      url: '/v1//auth/sign-in',
      headers: { 'content-type': 'application/json' },
      payload: { email: 'test@example.com', password: 'password123' },
    });

    expect(noSlash.statusCode).not.toBe(404);
    expect(trailing.statusCode).toBe(noSlash.statusCode);
    expect(duplicate.statusCode).toBe(noSlash.statusCode);
  });
});

describe('Fastify adapter — production CORS allowlist', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await buildApp({ corsOrigin: PRODUCTION_CORS_ORIGINS });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(PRODUCTION_CORS_ORIGINS)(
    'reflects allowed origin %s',
    async (origin) => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/v1/auth/sign-in',
        headers: {
          origin,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type',
        },
      });
      expect(res.statusCode).toBeLessThan(300);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    },
  );

  it('does not reflect a disallowed origin', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/sign-in',
      headers: {
        origin: 'https://evil.example.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Fastify adapter — real AuthService.signIn cookie flow', () => {
  let app: NestFastifyApplication;
  const passwordHash = bcrypt.hashSync('password123', 4);

  const realPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'real@example.com',
        password: passwordHash,
        provider: 'LOCAL',
        isVerifyEmail: true,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const mockJwt = {
    signAsync: jest
      .fn()
      .mockImplementation(async (_, opts) =>
        opts?.secret === 'access' ? 'access.jwt' : 'refresh.jwt',
      ),
  };
  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access',
    JWT_REFRESH_SECRET: 'refresh',
    STUDENT_JWT_ACCESS_SECRET: 'student-access',
    STUDENT_JWT_REFRESH_SECRET: 'student-refresh',
    GOOGLE_CLIENT_ID: 'gid',
    GOOGLE_CLIENT_SECRET: 'gsecret',
    GOOGLE_CALL_BACK: 'https://x/cb',
    NODE_ENV: 'test',
    // AuthService.initializeGoogleAuth atob()s this in its constructor.
    // Empty string is a valid base64 input → atob('') === ''.
    GOOGLE_CLOUD_PRIVATE_KEY_ENCODE: '',
  };
  const mockConfig = {
    get: jest.fn((k: string) => configValues[k]),
  };

  beforeAll(async () => {
    app = await buildApp({
      corsOrigin: true,
      realAuth: true,
      prisma: realPrisma,
      jwt: mockJwt,
      config: mockConfig,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // Regression guard for the ms-vs-sec cookie bug: the real AuthService.signIn
  // must serialize Max-Age in seconds via @fastify/cookie. If anyone changes
  // setCookieAccessToken/setCookieRefreshToken to pass milliseconds, the
  // Set-Cookie header below would no longer be Max-Age=259200.
  it('POST /v1/auth/sign-in runs the real service and sets seconds-based Max-Age cookies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/sign-in',
      headers: { 'content-type': 'application/json' },
      payload: { email: 'real@example.com', password: 'password123' },
    });

    expect(res.statusCode).toBe(200);
    expect(realPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'real@example.com' },
    });

    const setCookies = res.headers['set-cookie'];
    const cookieArr = Array.isArray(setCookies) ? setCookies : [setCookies];
    const joined = cookieArr.join('\n');
    expect(joined).toMatch(/access_token=access\.jwt/);
    expect(joined).toMatch(/refresh_token=refresh\.jwt/);
    expect(joined).toMatch(/Max-Age=259200/);
    expect(joined).toMatch(/Secure/);
    expect(joined).toMatch(/SameSite=None/);
  });
});

describe('Fastify adapter — real AuthGuard(google) initial redirect', () => {
  let app: NestFastifyApplication;

  // GoogleStrategy reads these from ConfigService at provider-construction time
  // (super({ clientID, clientSecret, callbackURL })). Strategies for JWT etc.
  // also need their secrets so the AppModule can construct.
  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access',
    JWT_REFRESH_SECRET: 'refresh',
    STUDENT_JWT_ACCESS_SECRET: 'student-access',
    STUDENT_JWT_REFRESH_SECRET: 'student-refresh',
    GOOGLE_CLIENT_ID: 'gid',
    GOOGLE_CLIENT_SECRET: 'gsecret',
    GOOGLE_CALL_BACK: 'https://x/cb',
    NODE_ENV: 'test',
  };
  const mockConfig = {
    get: jest.fn((k: string) => configValues[k]),
  };

  beforeAll(async () => {
    app = await buildApp({
      corsOrigin: true,
      realGoogleGuard: true,
      config: mockConfig,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // Regression guard for the production crash:
  //   TypeError: res.setHeader is not a function
  //   at passport/lib/middleware/authenticate.js:340 (res.setHeader("Location", url))
  // passport-oauth2's strategy.redirect() calls Express-style res.setHeader and
  // res.end. Without the Fastify shim registered in main.ts, this 500s.
  it('GET /v1/auth/google redirects to accounts.google.com via passport-oauth2', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/auth/google' });
    expect(res.statusCode).toBe(302);
    expect(res.headers['location']).toMatch(
      /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/,
    );
    expect(res.headers['location']).toContain('client_id=gid');
  });
});

describe('Fastify adapter — UserGuard via fastify-passport', () => {
  let app: NestFastifyApplication;
  // The JWT secret must match what UserAccessTokenStrategy reads from config.
  // mockConfig below returns 'access' for JWT_ACCESS_SECRET, so we sign with
  // the same string.
  const validToken = jwt.sign({ id: 'u-1', email: 'u@x.com' }, 'access');

  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access',
    JWT_REFRESH_SECRET: 'refresh',
    STUDENT_JWT_ACCESS_SECRET: 'student-access',
    STUDENT_JWT_REFRESH_SECRET: 'student-refresh',
    GOOGLE_CLIENT_ID: 'gid',
    GOOGLE_CLIENT_SECRET: 'gsecret',
    GOOGLE_CALL_BACK: 'https://x/cb',
    NODE_ENV: 'test',
  };
  const mockConfig = {
    get: jest.fn((k: string) => configValues[k]),
  };

  beforeAll(async () => {
    app = await buildApp({
      corsOrigin: true,
      realUserGuard: true,
      config: mockConfig,
    });
  });

  afterAll(async () => app.close());

  // Pick any always-existing UserGuard-protected GET route in the codebase.
  // We use /v1/users/me. The downstream handler will likely error (Prisma is
  // mocked as {}), but that's fine — the test is verifying the GUARD
  // behavior, not the controller's business logic.
  it('GET /v1/users/me accepts a valid Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/users/me',
      headers: { authorization: `Bearer ${validToken}` },
    });
    expect(res.statusCode).not.toBe(401);
  });

  it('GET /v1/users/me without Bearer token returns 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/users/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Fastify adapter — real googleLogin handles non-ASCII (Thai) names', () => {
  let app: NestFastifyApplication;

  // Real Google profiles for Thai users contain Thai script in givenName /
  // familyName, plus a photo URL whose own query string contains `=` and `&`.
  // Both broke the redirect before fix: Node's setHeader('Location', url)
  // rejects non-ASCII bytes with "Invalid character in header content".
  const thaiUser = {
    provider: 'GOOGLE',
    providerId: 'gid-สมชาย',
    email: 'somchai@example.com',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    photo: 'https://lh3.googleusercontent.com/a/x=s96-c&foo=bar',
    phone: '',
  };

  // googleLogin now also looks up a pending invite by email
  // (memberOnSchoolService.memberOnSchoolRepository.findFirst) when the
  // Google user has no User record yet. The mock starts returning null
  // (no invite); individual tests override it to exercise the
  // invite-found branch.
  const memberOnSchoolFindFirst = jest.fn().mockResolvedValue(null);
  const realPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    memberOnSchool: {
      findFirst: memberOnSchoolFindFirst,
    },
  };

  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access',
    JWT_REFRESH_SECRET: 'refresh',
    STUDENT_JWT_ACCESS_SECRET: 'student-access',
    STUDENT_JWT_REFRESH_SECRET: 'student-refresh',
    GOOGLE_CLIENT_ID: 'gid',
    GOOGLE_CLIENT_SECRET: 'gsecret',
    GOOGLE_CALL_BACK: 'https://x/cb',
    CLIENT_URL: 'https://app.tatugaschool.com',
    NODE_ENV: 'test',
    GOOGLE_CLOUD_PRIVATE_KEY_ENCODE: '',
  };
  const mockConfig = {
    get: jest.fn((k: string) => configValues[k]),
  };

  beforeAll(async () => {
    process.env.CLIENT_URL = 'https://app.tatugaschool.com';
    app = await buildApp({
      corsOrigin: true,
      realAuth: true,
      googleGuardUser: thaiUser,
      prisma: realPrisma,
      config: mockConfig,
    });
  });

  afterAll(async () => app.close());

  // Regression for: TypeError: Invalid character in header content ["location"]
  // at node:_http_outgoing.setHeader, called from googleLogin's redirect.
  it('GET /v1/auth/google/redirect produces an ASCII-safe Location with encoded Thai chars', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/google/redirect',
    });

    expect(res.statusCode).toBe(302);
    const location = res.headers['location'];
    expect(typeof location).toBe('string');

    // Node's setHeader rejects bytes outside printable ASCII. If this regex
    // fails the assertion, production would 500 with the original error.
    expect(location as string).toMatch(/^[\x20-\x7E]*$/);

    // Confirm the user-supplied Thai chars are present in their URL-encoded
    // form, not as raw UTF-8 bytes.
    expect(location).toContain(encodeURIComponent('สมชาย'));
    expect(location).toContain(encodeURIComponent('ใจดี'));

    // Round-trip: the client at /auth/sign-up should be able to decode the
    // query and get the original values back unchanged.
    const url = new URL(location as string);
    expect(url.pathname).toBe('/auth/sign-up');
    expect(url.searchParams.get('email')).toBe(thaiUser.email);
    expect(url.searchParams.get('firstName')).toBe(thaiUser.firstName);
    expect(url.searchParams.get('lastName')).toBe(thaiUser.lastName);
    expect(url.searchParams.get('provider')).toBe('google');
    expect(url.searchParams.get('providerId')).toBe(thaiUser.providerId);
    expect(url.searchParams.get('photo')).toBe(thaiUser.photo);
    // No pending invite for this email -> token is absent.
    expect(url.searchParams.get('invitationToken')).toBeNull();
  });

  // When a pending invite exists for the Google user's email,
  // googleLogin must forward the invitationToken to /auth/sign-up so the
  // signup page can lock the email and the form can claim the invite.
  it('forwards invitationToken to /auth/sign-up when a pending invite matches the Google email', async () => {
    memberOnSchoolFindFirst.mockResolvedValueOnce({
      id: 'inv-1',
      email: thaiUser.email,
      schoolId: 'sch-1',
      invitationToken: 'tok-abc-123',
      invitationTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/google/redirect',
    });

    expect(res.statusCode).toBe(302);
    const location = res.headers['location'] as string;
    expect(typeof location).toBe('string');
    expect(location).toMatch(/^[\x20-\x7E]*$/);

    const url = new URL(location);
    expect(url.pathname).toBe('/auth/sign-up');
    expect(url.searchParams.get('invitationToken')).toBe('tok-abc-123');
  });
});
