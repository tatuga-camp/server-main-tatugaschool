// Matches exactly what Date#toJSON emits, which is how Prisma dates serialise.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return value;
  const date = new Date(value);
  // Date-shaped user text that is not a real date (e.g. month 13) must stay text.
  return !isNaN(date.getTime()) && date.toISOString() === value ? date : value;
}
