import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { reviveDates } from './revive-dates';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    name: string,
    scopes: string[],
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    let key: string;
    try {
      const versions =
        scopes.length > 0
          ? await this.redis.mget(...scopes.map((s) => `ver:${s}`))
          : [];
      key = `cache:${name}:${versions.map((v) => v ?? '0').join('.')}`;
      const hit = await this.redis.get(key);
      if (hit !== null) {
        return JSON.parse(hit, reviveDates) as T;
      }
    } catch (error) {
      this.logger.warn(`cache read failed for ${name}: ${error}`);
      return loader();
    }

    const value = await loader();
    try {
      await this.redis.set(key, JSON.stringify(value ?? null), 'EX', ttlSeconds);
    } catch (error) {
      this.logger.warn(`cache write failed for ${name}: ${error}`);
    }
    return value;
  }

  async bump(...scopes: string[]): Promise<void> {
    const unique = [...new Set(scopes)];
    if (unique.length === 0) return;
    try {
      const pipeline = this.redis.pipeline();
      unique.forEach((scope) => pipeline.incr(`ver:${scope}`));
      await pipeline.exec();
    } catch (error) {
      this.logger.error(`cache bump failed for ${unique.join(',')}: ${error}`);
    }
  }

  async del(name: string): Promise<void> {
    try {
      await this.redis.del(`cache:${name}:`);
    } catch (error) {
      this.logger.warn(`cache del failed for ${name}: ${error}`);
    }
  }
}
