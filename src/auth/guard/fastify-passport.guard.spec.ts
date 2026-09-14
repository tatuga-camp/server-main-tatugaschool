import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { createFastifyPassportGuard } from './fastify-passport.guard';

jest.mock('@fastify/passport', () => ({
  __esModule: true,
  default: {
    authenticate: jest.fn(),
  },
}));
import fastifyPassport from '@fastify/passport';

describe('FastifyPassportGuard', () => {
  const buildContext = (): ExecutionContext => {
    const req: any = { headers: {} };
    const reply: any = {};
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => reply,
      }),
    } as any;
  };

  beforeEach(() => jest.clearAllMocks());

  it('returns true when authenticate succeeds and attaches user', async () => {
    (fastifyPassport.authenticate as jest.Mock).mockImplementation(
      (_name, _opts, callback) => async (req: any) => {
        await callback(req, {}, null, { id: 'u1' });
      },
    );
    const Guard = createFastifyPassportGuard('user-jwt');
    const guard = new (Guard as any)();
    const ctx = buildContext();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toEqual({ id: 'u1' });
  });

  it('throws UnauthorizedException when authenticate fails', async () => {
    (fastifyPassport.authenticate as jest.Mock).mockImplementation(
      (_name, _opts, callback) => async (req: any) => {
        await callback(req, {}, new Error('bad'), null);
      },
    );
    const Guard = createFastifyPassportGuard('user-jwt');
    const guard = new (Guard as any)();
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('handleRequest hook overrides user / error treatment', async () => {
    (fastifyPassport.authenticate as jest.Mock).mockImplementation(
      (_name, _opts, callback) => async (req: any) => {
        await callback(req, {}, null, { id: 'u1', isVerifyEmail: false });
      },
    );
    const Guard = createFastifyPassportGuard('user-jwt');
    class Custom extends (Guard as any) {
      handleRequest(_err: unknown, user: any) {
        if (!user.isVerifyEmail) throw new UnauthorizedException('unverified');
        return user;
      }
    }
    const guard = new Custom();
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      'unverified',
    );
  });

  it('awaits an async handleRequest and propagates its rejection', async () => {
    (fastifyPassport.authenticate as jest.Mock).mockImplementation(
      (_name, _opts, callback) => async (req: any) => {
        await callback(req, {}, null, { id: 'u1' });
      },
    );
    const Guard = createFastifyPassportGuard('user-jwt');
    class AsyncCustom extends (Guard as any) {
      async handleRequest(_err: unknown, _user: any) {
        await Promise.resolve();
        throw new UnauthorizedException('async-rejected');
      }
    }
    const guard = new AsyncCustom();
    await expect(guard.canActivate(buildContext())).rejects.toThrow(
      'async-rejected',
    );
  });

  it('attaches the resolved value of an async handleRequest to req.user', async () => {
    (fastifyPassport.authenticate as jest.Mock).mockImplementation(
      (_name, _opts, callback) => async (req: any) => {
        await callback(req, {}, null, { id: 'u1' });
      },
    );
    const Guard = createFastifyPassportGuard('user-jwt');
    class AsyncCustom extends (Guard as any) {
      async handleRequest(_err: unknown, user: any) {
        await Promise.resolve();
        return { ...user, enriched: true };
      }
    }
    const guard = new AsyncCustom();
    const ctx = buildContext();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.switchToHttp().getRequest().user).toEqual({
      id: 'u1',
      enriched: true,
    });
  });
});
