// src/quiz-integrity/jev.client.spec.ts
import { emptySummary } from './integrity-summary';
import { buildJevRequest, JEV_URL, JevClient, parseJevResponse } from './jev.client';

const input = {
  summary: { ...emptySummary(), exitCount: 2, totalAwayMs: 45_000, longestAwayMs: 30_000, translateDetected: true },
  questionCount: 10,
  answeredCount: 6,
  timeLimitMinutes: 20,
  elapsedMs: 9 * 60_000,
};

describe('buildJevRequest', () => {
  it('uses jev-latest, anonymized state and the two questions', () => {
    const body = buildJevRequest(input);
    expect(body.model).toBe('jev-latest');
    expect(body.state).toMatchObject({
      questionCount: 10,
      answeredCount: 6,
      timeLimitMinutes: 20,
      elapsedMinutes: 9,
      exitsLongerThan1s: 2,
      totalSecondsAway: 45,
      longestSecondsAway: 30,
      translatorDetected: true,
    });
    expect(body.questions.outside_help.type).toBe('noul');
    expect(body.questions.pattern.type).toBe('choice');
    expect(Object.keys(body.questions.pattern.criteria)).toEqual(['normal', 'connectivity', 'distracted', 'outside_help']);
    expect(JSON.stringify(body)).not.toMatch(/firstName|lastName|studentId|schoolId/);
  });
});

describe('parseJevResponse', () => {
  it('maps noul to a 0–100 score and choice to a pattern', () => {
    expect(
      parseJevResponse({
        answers: {
          outside_help: { type: 'noul', noul: 0.834 },
          pattern: { type: 'choice', choice: 'outside_help', probabilities: {}, confidence: 0.7 },
        },
      }),
    ).toEqual({ riskScore: 83, pattern: 'OUTSIDE_HELP', confidence: 0.7 });
  });
  it('returns null when noul is missing; tolerates a missing pattern', () => {
    expect(parseJevResponse({ answers: {} })).toBeNull();
    expect(parseJevResponse(null)).toBeNull();
    expect(parseJevResponse({ answers: { outside_help: { noul: 0.1 } } })).toEqual({ riskScore: 10, pattern: null, confidence: null });
  });
});

describe('JevClient.evaluate', () => {
  const client = new JevClient();
  let fetchSpy: jest.SpyInstance;
  const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

  beforeEach(() => {
    process.env.TYPESAFE_AI_API_KEY = 'test-key';
    fetchSpy = jest.spyOn(global, 'fetch');
  });
  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.TYPESAFE_AI_API_KEY;
    jest.useRealTimers();
  });

  it('returns null without calling fetch when no key is set', async () => {
    delete process.env.TYPESAFE_AI_API_KEY;
    expect(client.isEnabled()).toBe(false);
    await expect(client.evaluate(input)).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('posts to the decision endpoint with bearer auth', async () => {
    fetchSpy.mockImplementation(() => ok({ answers: { outside_help: { noul: 0.5 }, pattern: { choice: 'distracted', confidence: 0.6 } } }));
    await expect(client.evaluate(input)).resolves.toEqual({ riskScore: 50, pattern: 'DISTRACTED', confidence: 0.6 });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(JEV_URL);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
  });
  it('returns null on a non-2xx response', async () => {
    fetchSpy.mockImplementation(() => Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({}) } as Response));
    await expect(client.evaluate(input)).resolves.toBeNull();
  });
  it('returns null when fetch rejects', async () => {
    fetchSpy.mockImplementation(() => Promise.reject(new Error('network')));
    await expect(client.evaluate(input)).resolves.toBeNull();
  });
  it('returns null after the 5 s timeout', async () => {
    jest.useFakeTimers();
    fetchSpy.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
        }),
    );
    const pending = client.evaluate(input);
    jest.advanceTimersByTime(5_000);
    await expect(pending).resolves.toBeNull();
  });
});
