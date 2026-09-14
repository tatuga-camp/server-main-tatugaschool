import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserGuard } from './user.guard';

jest.mock('@fastify/passport', () => ({
  __esModule: true,
  default: { authenticate: jest.fn() },
}));

describe('UserGuard', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const payload = { id: 'u1', email: 'a@b.com' };
  let guard: UserGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new UserGuard(prisma as any);
  });

  it('throws 401 when passport reports an error', async () => {
    await expect(
      guard.handleRequest(new Error('bad'), payload),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('throws 401 when there is no JWT payload', async () => {
    await expect(guard.handleRequest(null, undefined as any)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('throws 401 when the user record no longer exists', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(guard.handleRequest(null, payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('throws 403 "Email not verified" when isVerifyEmail is false', async () => {
    prisma.user.findUnique.mockResolvedValue({ isVerifyEmail: false });
    const promise = guard.handleRequest(null, payload);
    await expect(promise).rejects.toThrow(ForbiddenException);
    await expect(promise).rejects.toThrow('Email not verified');
  });

  it('returns the JWT payload when isVerifyEmail is true', async () => {
    prisma.user.findUnique.mockResolvedValue({ isVerifyEmail: true });
    await expect(guard.handleRequest(null, payload)).resolves.toEqual(payload);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { isVerifyEmail: true },
    });
  });
});
