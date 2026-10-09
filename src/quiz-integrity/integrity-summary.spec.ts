import {
  detectHeartbeatGap,
  emptySummary,
  isEmptySummary,
  prepareClientEvents,
  summarizeEvents,
  summaryHash,
} from './integrity-summary';

describe('prepareClientEvents', () => {
  const now = new Date('2026-10-09T03:10:00Z');
  const startedAt = new Date('2026-10-09T03:00:00Z'); // 600 000 ms ago

  it('drops client-sent HEARTBEAT_GAP and stamps serverAt', () => {
    const out = prepareClientEvents(
      [
        { type: 'HEARTBEAT_GAP', clientAt: now.toISOString(), durationMs: 5 },
        { type: 'HIDDEN', clientAt: '2026-10-09T03:09:00Z' },
      ],
      now,
      startedAt,
    );
    expect(out).toEqual([
      {
        type: 'HIDDEN',
        clientAt: new Date('2026-10-09T03:09:00Z'),
        serverAt: now,
        durationMs: null,
      },
    ]);
  });
  it('keeps duration only on VISIBLE/FOCUS and clamps it to the attempt age', () => {
    const out = prepareClientEvents(
      [
        { type: 'VISIBLE', clientAt: now.toISOString(), durationMs: 9_999_999 },
        { type: 'FOCUS', clientAt: now.toISOString(), durationMs: -3 },
        { type: 'COPY_ATTEMPT', clientAt: now.toISOString(), durationMs: 50 },
      ],
      now,
      startedAt,
    );
    expect(out.map((e) => e.durationMs)).toEqual([600_000, 0, null]);
  });
  it('replaces an invalid clientAt with now', () => {
    const [event] = prepareClientEvents(
      [{ type: 'BLUR', clientAt: 'nonsense' }],
      now,
      startedAt,
    );
    expect(event.clientAt).toEqual(now);
  });
});

describe('detectHeartbeatGap', () => {
  const last = new Date('2026-10-09T03:00:00Z');
  it('returns null for a normal 10 s beat', () => {
    expect(
      detectHeartbeatGap(last, new Date('2026-10-09T03:00:10Z'), []),
    ).toBeNull();
  });
  it('returns the gap when over 25 s', () => {
    expect(detectHeartbeatGap(last, new Date('2026-10-09T03:00:40Z'), [])).toBe(
      40_000,
    );
  });
  it('returns null when the batch already explains the absence', () => {
    expect(
      detectHeartbeatGap(last, new Date('2026-10-09T03:00:40Z'), [
        { type: 'VISIBLE' },
      ]),
    ).toBeNull();
  });
});

describe('summarizeEvents', () => {
  it('counts exits ≥ 1 s, away time, blur, flags and gaps', () => {
    const summary = summarizeEvents([
      { type: 'HIDDEN', durationMs: null },
      { type: 'VISIBLE', durationMs: 12_000 },
      { type: 'VISIBLE', durationMs: 400 }, // blip, not an exit
      { type: 'FOCUS', durationMs: 3_000 },
      { type: 'TRANSLATE_DETECTED', durationMs: null },
      { type: 'PASTE_ATTEMPT', durationMs: null },
      { type: 'COPY_ATTEMPT', durationMs: null },
      { type: 'FULLSCREEN_EXIT', durationMs: null },
      { type: 'SCREENSHOT_KEY', durationMs: null },
      { type: 'HEARTBEAT_GAP', durationMs: 40_000 },
    ]);
    expect(summary).toEqual({
      exitCount: 2,
      totalAwayMs: 15_000,
      longestAwayMs: 12_000,
      blurCount: 1,
      translateDetected: true,
      pasteAttempts: 1,
      copyAttempts: 1,
      fullscreenExits: 1,
      screenshotKeyCount: 1,
      heartbeatGapCount: 1,
      longestHeartbeatGapMs: 40_000,
    });
  });
  it('empty input gives the empty summary', () => {
    expect(summarizeEvents([])).toEqual(emptySummary());
    expect(isEmptySummary(emptySummary())).toBe(true);
  });
});

describe('summaryHash', () => {
  it('is independent of key order and changes with values', () => {
    const a = emptySummary();
    const reordered = Object.fromEntries(
      Object.entries(a).reverse(),
    ) as typeof a;
    expect(summaryHash(a)).toBe(summaryHash(reordered));
    expect(summaryHash({ ...a, exitCount: 1 })).not.toBe(summaryHash(a));
  });
});
