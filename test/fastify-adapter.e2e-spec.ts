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

  it('boots', () => {
    expect(app).toBeDefined();
  });
});
