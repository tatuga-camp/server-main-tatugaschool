import { toSubmissionCounts } from './submission-counts';

const rows = [
  { assignmentId: 'a1', status: 'SUBMITTED', isAssigned: true },
  { assignmentId: 'a1', status: 'SUBMITTED', isAssigned: false },
  { assignmentId: 'a1', status: 'PENDDING', isAssigned: true },
  { assignmentId: 'a1', status: 'PENDDING', isAssigned: false },
  { assignmentId: 'a1', status: 'REVIEWD', isAssigned: true },
  { assignmentId: 'a2', status: 'PENDDING', isAssigned: true },
];

function legacy(assignmentId: string) {
  const s = rows.filter((r) => r.assignmentId === assignmentId);
  return {
    studentAssign: s.length,
    summitNumber: s.filter((r) => r.status === 'SUBMITTED').length,
    penddingNumber: s.filter(
      (r) => r.status === 'PENDDING' && r.isAssigned === true,
    ).length,
    reviewNumber: s.filter((r) => r.status === 'REVIEWD').length,
  };
}

function groupBy() {
  const map = new Map<string, any>();
  for (const r of rows) {
    const k = `${r.assignmentId}|${r.status}|${r.isAssigned}`;
    const g = map.get(k) ?? { ...r, _count: { _all: 0 } };
    g._count._all++;
    map.set(k, g);
  }
  return [...map.values()];
}

describe('toSubmissionCounts', () => {
  it('matches the legacy in-memory counts', () => {
    const counts = toSubmissionCounts(groupBy());
    expect(counts.a1).toEqual(legacy('a1'));
    expect(counts.a2).toEqual(legacy('a2'));
  });

  it('returns an empty record for no groups', () => {
    expect(toSubmissionCounts([])).toEqual({});
  });
});
