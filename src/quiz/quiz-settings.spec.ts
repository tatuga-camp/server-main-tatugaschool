import {
  computeDeadline,
  isPastGrace,
  mergeQuizSettings,
  withDefaultQuizSettings,
} from './quiz-settings';

describe('quiz settings', () => {
  it('fills defaults', () => {
    expect(withDefaultQuizSettings(null)).toEqual({
      scoringMode: 'ALL_OR_NOTHING',
      timeLimitMinutes: null,
      shuffleQuestions: false,
      shuffleOptions: false,
      testMode: false,
      showAnswersAfterSubmit: false,
    });
    expect(withDefaultQuizSettings({ testMode: true }).testMode).toBe(true);
  });
  it('merges a partial patch without wiping other fields', () => {
    const existing = withDefaultQuizSettings({
      testMode: true,
      timeLimitMinutes: 20,
    });
    const merged = mergeQuizSettings(existing, {
      shuffleOptions: true,
      testMode: undefined,
    });
    expect(merged).toMatchObject({
      testMode: true,
      timeLimitMinutes: 20,
      shuffleOptions: true,
    });
  });
  it('allows clearing the time limit with null', () => {
    const existing = withDefaultQuizSettings({ timeLimitMinutes: 20 });
    expect(
      mergeQuizSettings(existing, { timeLimitMinutes: null }).timeLimitMinutes,
    ).toBeNull();
  });
});

describe('computeDeadline', () => {
  const start = new Date('2026-10-09T03:00:00Z');
  it('is null with no limit and no due date', () => {
    expect(computeDeadline(start, null, null)).toBeNull();
  });
  it('uses start + limit', () => {
    expect(computeDeadline(start, 30, null)?.toISOString()).toBe(
      '2026-10-09T03:30:00.000Z',
    );
  });
  it('takes the earlier of limit and due date', () => {
    const due = new Date('2026-10-09T03:10:00Z');
    expect(computeDeadline(start, 30, due)?.toISOString()).toBe(
      due.toISOString(),
    );
  });
});

describe('isPastGrace', () => {
  const deadline = new Date('2026-10-09T03:30:00Z');
  it('allows the 30 s grace', () => {
    expect(isPastGrace(deadline, new Date('2026-10-09T03:30:29Z'))).toBe(false);
    expect(isPastGrace(deadline, new Date('2026-10-09T03:30:31Z'))).toBe(true);
    expect(isPastGrace(null, new Date())).toBe(false);
  });
});
