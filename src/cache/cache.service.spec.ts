import { createTestCache } from './testing/cache-test-utils';
import { subjectScope } from './cache-scopes';

describe('CacheService', () => {
  const scope = subjectScope('s1', 'assignments');

  it('calls the loader once and serves the second read from cache', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue([{ id: 'a1' }]);
    expect(await cache.getOrSet('list:s1', [scope], 60, loader)).toEqual([{ id: 'a1' }]);
    expect(await cache.getOrSet('list:s1', [scope], 60, loader)).toEqual([{ id: 'a1' }]);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('reloads after a bump of a scope the value depends on', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');
    await cache.getOrSet('x', [scope], 60, loader);
    await cache.bump(scope);
    expect(await cache.getOrSet('x', [scope], 60, loader)).toBe('new');
  });

  it('does not reload after a bump of an unrelated scope', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue('v');
    await cache.getOrSet('x', [scope], 60, loader);
    await cache.bump(subjectScope('s1', 'roster'));
    await cache.getOrSet('x', [scope], 60, loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('passes the TTL to SET', async () => {
    const { cache, redis } = createTestCache();
    await cache.getOrSet('x', [scope], 123, async () => 1);
    expect([...redis.ttl.values()]).toEqual([123]);
  });

  it('round-trips Date values', async () => {
    const { cache } = createTestCache();
    const d = new Date('2026-10-02T03:04:05.678Z');
    await cache.getOrSet('x', [], 60, async () => ({ d }));
    const hit = await cache.getOrSet('x', [], 60, async () => ({ d: null }));
    expect(hit.d).toBeInstanceOf(Date);
    expect((hit.d as Date).toISOString()).toBe(d.toISOString());
  });

  it('caches null and empty-array results', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue(null);
    await cache.getOrSet('n', [], 60, loader);
    expect(await cache.getOrSet('n', [], 60, loader)).toBeNull();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('falls back to the loader when Redis fails', async () => {
    const { cache, redis } = createTestCache();
    redis.failing = true;
    expect(await cache.getOrSet('x', [scope], 60, async () => 'live')).toBe('live');
  });

  it('does not cache a loader error', async () => {
    const { cache } = createTestCache();
    await expect(
      cache.getOrSet('x', [], 60, async () => { throw new Error('boom'); }),
    ).rejects.toThrow('boom');
    expect(await cache.getOrSet('x', [], 60, async () => 'ok')).toBe('ok');
  });

  it('bump swallows Redis errors', async () => {
    const { cache, redis } = createTestCache();
    redis.failing = true;
    await expect(cache.bump(scope)).resolves.toBeUndefined();
  });

  it('del removes an unscoped entry', async () => {
    const { cache } = createTestCache();
    const loader = jest.fn().mockResolvedValue('v');
    await cache.getOrSet('code:ABC', [], 60, loader);
    await cache.del('code:ABC');
    await cache.getOrSet('code:ABC', [], 60, loader);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('bump with no scopes does not touch Redis', async () => {
    const { cache, redis } = createTestCache();
    const pipeline = jest.spyOn(redis, 'pipeline');
    await cache.bump();
    expect(pipeline).not.toHaveBeenCalled();
  });

  it('bump increments each distinct scope once', async () => {
    const { cache, redis } = createTestCache();
    const other = subjectScope('s1', 'roster');
    await cache.bump(scope, scope, other);
    expect(redis.store.get(`ver:${scope}`)).toBe('1');
    expect(redis.store.get(`ver:${other}`)).toBe('1');
  });

  it('returns the loaded value when the cache write fails', async () => {
    const { cache, redis } = createTestCache();
    jest.spyOn(redis, 'set').mockRejectedValue(new Error('redis down'));
    expect(await cache.getOrSet('x', [scope], 60, async () => 'live')).toBe('live');
  });

  it('del swallows Redis errors', async () => {
    const { cache, redis } = createTestCache();
    redis.failing = true;
    await expect(cache.del('code:ABC')).resolves.toBeUndefined();
  });
});
