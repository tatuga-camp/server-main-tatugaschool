const WRITE_OPS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

// Every prisma.<model>.<op> resolves to `record`. findMany resolves to [record],
// *Many writes to { count: 1 }, $transaction runs its array or callback, and
// $runCommandRaw resolves to { ok: 1, n: 1 }. With `failWrites`, every write
// op and $runCommandRaw rejects instead, while reads still resolve.
export function createPrismaStub(
  record: Record<string, unknown>,
  options: { failWrites?: boolean } = {},
): any {
  const fail = () => Promise.reject(new Error('write failed'));
  const model = () =>
    new Proxy(
      {},
      {
        get: (_t, op: string) =>
          jest.fn(async () => {
            if (options.failWrites && WRITE_OPS.has(op)) return fail();
            if (op === 'findMany') return [record];
            if (op.endsWith('Many')) return { count: 1 };
            if (op === 'count') return 1;
            return record;
          }),
      },
    );
  const stub: any = new Proxy(
    {},
    {
      get: (_t, prop: string) => {
        if (prop === '$transaction')
          return async (arg: any) =>
            Array.isArray(arg) ? Promise.all(arg) : arg(stub);
        if (prop === '$runCommandRaw')
          return jest.fn(async () =>
            options.failWrites ? fail() : { ok: 1, n: 1 },
          );
        return model();
      },
    },
  );
  return stub;
}
