import {
  computeFingerprint,
  firstStackFrame,
  normalizeFragment,
} from './fingerprint';

describe('fingerprint', () => {
  const base = {
    errorName: 'TypeError',
    message: "Cannot read properties of undefined (reading 'id')",
    stack: [
      "TypeError: Cannot read properties of undefined (reading 'id')",
      '    at StudentCard (http://localhost:8181/_next/static/chunks/pages/subject-abc123.js?v=1:120:33)',
      '    at renderWithHooks (http://localhost:8181/_next/static/chunks/framework.js:44:12)',
    ].join('\n'),
  };

  it('returns a 40 character sha1 hex string', () => {
    expect(computeFingerprint(base)).toMatch(/^[0-9a-f]{40}$/);
  });

  it('ignores object ids, uuids and numbers inside the message', () => {
    const a = computeFingerprint({
      ...base,
      message: 'Student 66f1a2b3c4d5e6f7a8b9c0d1 missing 3 scores',
    });
    const b = computeFingerprint({
      ...base,
      message: 'Student 5a5a5a5a5a5a5a5a5a5a5a5a missing 12 scores',
    });
    expect(a).toBe(b);
  });

  it('ignores line and column numbers and query strings in the first frame', () => {
    const b = computeFingerprint({
      ...base,
      stack: base.stack
        .replace(':120:33', ':7:1')
        .replace('?v=1', '?v=99'),
    });
    expect(computeFingerprint(base)).toBe(b);
  });

  it('differs when the error name differs', () => {
    expect(computeFingerprint({ ...base, errorName: 'RangeError' })).not.toBe(
      computeFingerprint(base),
    );
  });

  it('differs when the first frame function differs', () => {
    const other = base.stack.replace('at StudentCard', 'at TeacherCard');
    expect(computeFingerprint({ ...base, stack: other })).not.toBe(
      computeFingerprint(base),
    );
  });

  it('does not throw on an empty stack', () => {
    expect(() => computeFingerprint({ ...base, stack: '' })).not.toThrow();
  });

  it('firstStackFrame picks the first "at" line and strips line:col', () => {
    expect(firstStackFrame(base.stack)).toBe(
      'at StudentCard (http://localhost:8181/_next/static/chunks/pages/subject-abc123.js?v=1',
    );
  });

  it('normalizeFragment lowercases, strips query strings and masks ids and digits', () => {
    expect(
      normalizeFragment(
        'Load /api/v1/x?y=1 for 66f1a2b3c4d5e6f7a8b9c0d1 and 123e4567-e89b-12d3-a456-426614174000 took 45',
      ),
    ).toBe('load /api/v#/x for <id> and <id> took #');
  });
});
