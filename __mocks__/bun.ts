export class RedisClient {
  constructor(url?: string) {}
  async connect() {}
  close() {}
  async get(key: string) {
    return null;
  }
  async set(key: string, value: string, options?: any) {}
  async del(key: string) {}
  async hget(key: string, field: string) {
    return null;
  }
  async hset(key: string, field: string, value: string) {}
  async expire(key: string, seconds: number) {}
}
