import {
  computeDaysLeft,
  dueStage,
  parseReminderStages,
  serializeReminderState,
} from './subscription-reminder.helper';

describe('subscription-reminder.helper', () => {
  const now = new Date('2026-08-19T02:00:00.000Z');
  const day = 86_400_000;

  describe('computeDaysLeft', () => {
    it('returns 10 for exactly 10 days ahead', () => {
      expect(computeDaysLeft(new Date(now.getTime() + 10 * day), now)).toBe(10);
    });
    it('rounds partial days up', () => {
      expect(
        computeDaysLeft(new Date(now.getTime() + 9 * day + 1), now),
      ).toBe(10);
      expect(computeDaysLeft(new Date(now.getTime() + 1), now)).toBe(1);
    });
    it('returns 0 or negative when expired', () => {
      expect(computeDaysLeft(now, now)).toBe(0);
      expect(computeDaysLeft(new Date(now.getTime() - day), now)).toBe(-1);
    });
  });

  describe('dueStage', () => {
    it('maps days left to the deepest due stage', () => {
      expect(dueStage(11)).toBeNull();
      expect(dueStage(10)).toBe(10);
      expect(dueStage(4)).toBe(10);
      expect(dueStage(3)).toBe(3);
      expect(dueStage(2)).toBe(3);
      expect(dueStage(1)).toBe(1);
      expect(dueStage(0)).toBeNull();
      expect(dueStage(-1)).toBeNull();
    });
  });

  describe('parseReminderStages / serializeReminderState', () => {
    const expireAt = new Date('2026-08-29T12:00:00.000Z');

    it('round-trips stages for the same expiry', () => {
      const raw = serializeReminderState(expireAt, [10, 3]);
      expect(raw).toBe('2026-08-29T12:00:00.000Z|10,3');
      expect(parseReminderStages(raw, expireAt)).toEqual([10, 3]);
    });
    it('returns [] for null state', () => {
      expect(parseReminderStages(null, expireAt)).toEqual([]);
    });
    it('returns [] when the stored expiry differs (renewal resets stages)', () => {
      const raw = serializeReminderState(new Date('2026-07-01T00:00:00.000Z'), [10]);
      expect(parseReminderStages(raw, expireAt)).toEqual([]);
    });
    it('ignores malformed stage entries', () => {
      expect(
        parseReminderStages('2026-08-29T12:00:00.000Z|10,abc', expireAt),
      ).toEqual([10]);
      expect(parseReminderStages('garbage', expireAt)).toEqual([]);
    });
  });
});
