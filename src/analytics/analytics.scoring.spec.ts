import {
  RISK_WEIGHTS,
  TIER_THRESHOLDS,
  missingSubScore,
  lowScoreSubScore,
  attendanceSubScore,
  computeRiskScore,
  tierFor,
  StudentSignals,
} from './analytics.scoring';

describe('analytics.scoring', () => {
  describe('sub-scores', () => {
    it('missingSubScore: ratio of overdue-unsubmitted to assigned, 0-100', () => {
      expect(missingSubScore({ overdueUnsubmitted: 3, assignedPublished: 6 })).toBe(50);
      expect(missingSubScore({ overdueUnsubmitted: 0, assignedPublished: 6 })).toBe(0);
    });

    it('missingSubScore: null when nothing assigned (signal absent)', () => {
      expect(missingSubScore({ overdueUnsubmitted: 0, assignedPublished: 0 })).toBeNull();
    });

    it('lowScoreSubScore: inverse of average percent', () => {
      expect(lowScoreSubScore(70)).toBe(30);
      expect(lowScoreSubScore(100)).toBe(0);
    });

    it('lowScoreSubScore: null when no graded work', () => {
      expect(lowScoreSubScore(null)).toBeNull();
    });

    it('lowScoreSubScore: clamps to 0-100', () => {
      expect(lowScoreSubScore(120)).toBe(0);
      expect(lowScoreSubScore(-10)).toBe(100);
    });

    it('attendanceSubScore: absent rate 0-100', () => {
      expect(attendanceSubScore({ absentCount: 2, totalRecords: 10 })).toBe(20);
    });

    it('attendanceSubScore: null when no attendance records', () => {
      expect(attendanceSubScore({ absentCount: 0, totalRecords: 0 })).toBeNull();
    });
  });

  describe('computeRiskScore', () => {
    it('weights all three present signals', () => {
      // missing 50 * .4 + low 30 * .3 + attend 20 * .3 = 20 + 9 + 6 = 35
      const signals: StudentSignals = {
        missing: { overdueUnsubmitted: 3, assignedPublished: 6 },
        avgScorePercent: 70,
        attendance: { absentCount: 2, totalRecords: 10 },
      };
      const result = computeRiskScore(signals);
      expect(result.score).toBe(35);
      expect(result.limitedData).toBe(false);
    });

    it('re-normalizes weights when a signal is absent', () => {
      // only missing (50) and attendance (20) present.
      // weights .4 and .3 -> normalized .4/.7 and .3/.7
      // 50*(.4/.7) + 20*(.3/.7) = 28.57 + 8.57 = 37.14 -> round 37
      const signals: StudentSignals = {
        missing: { overdueUnsubmitted: 3, assignedPublished: 6 },
        avgScorePercent: null,
        attendance: { absentCount: 2, totalRecords: 10 },
      };
      const result = computeRiskScore(signals);
      expect(result.score).toBe(37);
      expect(result.limitedData).toBe(true);
    });

    it('returns score 0 and limitedData when no signals at all', () => {
      const result = computeRiskScore({
        missing: { overdueUnsubmitted: 0, assignedPublished: 0 },
        avgScorePercent: null,
        attendance: { absentCount: 0, totalRecords: 0 },
      });
      expect(result.score).toBe(0);
      expect(result.limitedData).toBe(true);
    });
  });

  describe('tierFor', () => {
    it('maps score to tier by thresholds', () => {
      expect(tierFor(60)).toBe('HIGH');
      expect(tierFor(59)).toBe('MEDIUM');
      expect(tierFor(35)).toBe('MEDIUM');
      expect(tierFor(34)).toBe('LOW');
    });
  });

  it('exposes weights and thresholds as constants', () => {
    expect(RISK_WEIGHTS.missing + RISK_WEIGHTS.lowScore + RISK_WEIGHTS.attendance).toBeCloseTo(1);
    expect(TIER_THRESHOLDS.high).toBe(60);
    expect(TIER_THRESHOLDS.medium).toBe(35);
  });
});
