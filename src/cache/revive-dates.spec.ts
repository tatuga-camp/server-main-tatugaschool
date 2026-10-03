import { reviveDates } from './revive-dates';

const parse = (value: unknown) =>
  JSON.parse(JSON.stringify({ value }), reviveDates).value;

describe('reviveDates', () => {
  it('revives a canonical Prisma date', () => {
    const d = new Date('2026-10-02T03:04:05.678Z');
    expect(parse(d)).toEqual(d);
  });

  it.each(['2026-13-01T00:00:00.000Z', '2026-02-30T00:00:00.000Z'])(
    'leaves date-shaped user text that is not a real date untouched: %s',
    (text) => {
      expect(parse(text)).toBe(text);
    },
  );

  it('leaves ordinary strings untouched', () => {
    expect(parse('hello')).toBe('hello');
  });
});
