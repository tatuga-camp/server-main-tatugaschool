import { emptySummary } from './integrity-summary';
import { ruleRiskScore } from './risk-rules';

describe('ruleRiskScore', () => {
  it('is 0 for a clean attempt', () => {
    expect(ruleRiskScore(emptySummary())).toBe(0);
  });
  it('keeps one short exit Low (< 30)', () => {
    expect(
      ruleRiskScore({
        ...emptySummary(),
        exitCount: 1,
        totalAwayMs: 3_000,
        longestAwayMs: 3_000,
      }),
    ).toBe(1);
  });
  it('puts 3 exits / 60 s / longest 35 s in Medium', () => {
    expect(
      ruleRiskScore({
        ...emptySummary(),
        exitCount: 3,
        totalAwayMs: 60_000,
        longestAwayMs: 35_000,
      }),
    ).toBe(46);
  });
  it('caps at 100', () => {
    expect(
      ruleRiskScore({
        ...emptySummary(),
        exitCount: 4,
        totalAwayMs: 100_000,
        longestAwayMs: 40_000,
        translateDetected: true,
        pasteAttempts: 2,
        screenshotKeyCount: 3,
        heartbeatGapCount: 3,
      }),
    ).toBe(100);
  });
  it('adds +10 per screenshot key up to +20', () => {
    expect(ruleRiskScore({ ...emptySummary(), screenshotKeyCount: 1 })).toBe(
      10,
    );
    expect(ruleRiskScore({ ...emptySummary(), screenshotKeyCount: 5 })).toBe(
      20,
    );
  });
});
