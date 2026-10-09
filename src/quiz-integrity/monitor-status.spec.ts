import { deriveMonitorStatus } from './monitor-status';

const now = new Date('2026-10-09T03:10:00Z');
const fresh = { submittedAt: null, lastSeenAt: new Date('2026-10-09T03:09:55Z') };

describe('deriveMonitorStatus', () => {
  it('NOT_STARTED without an attempt', () => {
    expect(deriveMonitorStatus({ attempt: null, lastAwayReturnType: null, testMode: true, now })).toBe('NOT_STARTED');
  });
  it('SUBMITTED wins', () => {
    expect(deriveMonitorStatus({ attempt: { ...fresh, submittedAt: now }, lastAwayReturnType: 'HIDDEN', testMode: true, now })).toBe('SUBMITTED');
  });
  it('AWAY when the last away/return event is an away event', () => {
    expect(deriveMonitorStatus({ attempt: fresh, lastAwayReturnType: 'HIDDEN', testMode: true, now })).toBe('AWAY');
  });
  it('AWAY when no heartbeat for over 25 s', () => {
    expect(deriveMonitorStatus({ attempt: { submittedAt: null, lastSeenAt: new Date('2026-10-09T03:09:00Z') }, lastAwayReturnType: 'VISIBLE', testMode: true, now })).toBe('AWAY');
  });
  it('ANSWERING otherwise, and never AWAY without test mode', () => {
    expect(deriveMonitorStatus({ attempt: fresh, lastAwayReturnType: 'VISIBLE', testMode: true, now })).toBe('ANSWERING');
    expect(deriveMonitorStatus({ attempt: { submittedAt: null, lastSeenAt: new Date(0) }, lastAwayReturnType: 'HIDDEN', testMode: false, now })).toBe('ANSWERING');
  });
});
