import { CacheService } from '../cache.service';
import { FakeRedis } from './fake-redis';

export function createTestCache(): { cache: CacheService; redis: FakeRedis } {
  const redis = new FakeRedis();
  return { cache: new CacheService(redis as any), redis };
}

export function createPassthroughCache(): CacheService {
  return {
    getOrSet: jest.fn((_n: string, _s: string[], _t: number, loader: () => Promise<unknown>) => loader()),
    bump: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as CacheService;
}
