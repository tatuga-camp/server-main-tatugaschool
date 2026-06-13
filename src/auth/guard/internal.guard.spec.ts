import { UnauthorizedException } from '@nestjs/common';
import { InternalGuard } from './internal.guard';

describe('InternalGuard', () => {
  const makeCtx = (key?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: key ? { 'x-internal-key': key } : {} }),
      }),
    }) as any;

  const config = (value?: string) => ({ get: () => value }) as any;

  it('allows when header matches configured key', () => {
    const guard = new InternalGuard(config('secret123'));
    expect(guard.canActivate(makeCtx('secret123'))).toBe(true);
  });

  it('rejects when header is missing', () => {
    const guard = new InternalGuard(config('secret123'));
    expect(() => guard.canActivate(makeCtx())).toThrow(UnauthorizedException);
  });

  it('rejects when header does not match', () => {
    const guard = new InternalGuard(config('secret123'));
    expect(() => guard.canActivate(makeCtx('wrong'))).toThrow(UnauthorizedException);
  });

  it('rejects when no key is configured (fail closed)', () => {
    const guard = new InternalGuard(config(undefined));
    expect(() => guard.canActivate(makeCtx('anything'))).toThrow(UnauthorizedException);
  });
});
