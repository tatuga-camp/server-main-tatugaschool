// Matches exactly what Date#toJSON emits, which is how Prisma dates serialise.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE.test(value)
    ? new Date(value)
    : value;
}
