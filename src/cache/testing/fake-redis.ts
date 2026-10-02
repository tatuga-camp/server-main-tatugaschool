export class FakeRedis {
  store = new Map<string, string>();
  ttl = new Map<string, number>();
  failing = false;

  private check() {
    if (this.failing) throw new Error('redis unavailable');
  }
  async get(key: string) {
    this.check();
    return this.store.get(key) ?? null;
  }
  async mget(...keys: string[]) {
    this.check();
    return keys.map((k) => this.store.get(k) ?? null);
  }
  async set(key: string, value: string, _ex: 'EX', ttl: number) {
    this.check();
    this.store.set(key, value);
    this.ttl.set(key, ttl);
    return 'OK';
  }
  async del(key: string) {
    this.check();
    return this.store.delete(key) ? 1 : 0;
  }
  pipeline() {
    const keys: string[] = [];
    const chain = {
      incr: (key: string) => {
        keys.push(key);
        return chain;
      },
      exec: async () => {
        this.check();
        return keys.map((key) => {
          const next = Number(this.store.get(key) ?? 0) + 1;
          this.store.set(key, String(next));
          return [null, next];
        });
      },
    };
    return chain;
  }
}
