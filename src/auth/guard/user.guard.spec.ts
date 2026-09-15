import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserGuard } from './user.guard';

jest.mock('@fastify/passport', () => ({
  __esModule: true,
  default: { authenticate: jest.fn() },
}));

describe('UserGuard', () => {
  const guard = new UserGuard();
  const verified = { id: 'u1', email: 'a@b.com', isVerifyEmail: true };

  it('throws 401 when passport reports an error', () => {
    expect(() => guard.handleRequest(new Error('bad'), verified)).toThrow(
      UnauthorizedException,
    );
  });

  it('throws 401 when there is no JWT payload', () => {
    expect(() => guard.handleRequest(null, undefined as any)).toThrow(
      UnauthorizedException,
    );
  });

  it('throws 403 "Email not verified" when isVerifyEmail is false', () => {
    expect(() =>
      guard.handleRequest(null, { ...verified, isVerifyEmail: false }),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.handleRequest(null, { ...verified, isVerifyEmail: false }),
    ).toThrow('Email not verified');
  });

  it('treats a token issued without the claim as unverified', () => {
    expect(() =>
      guard.handleRequest(null, { id: 'u1', email: 'a@b.com' } as any),
    ).toThrow(ForbiddenException);
  });

  it('returns the JWT payload when isVerifyEmail is true', () => {
    expect(guard.handleRequest(null, verified)).toEqual(verified);
  });
});
