export type SubmissionCounts = {
  studentAssign: number;
  summitNumber: number;
  penddingNumber: number;
  reviewNumber: number;
};

export const EMPTY_COUNTS: SubmissionCounts = {
  studentAssign: 0,
  summitNumber: 0,
  penddingNumber: 0,
  reviewNumber: 0,
};

type Group = {
  assignmentId: string;
  status: string;
  isAssigned: boolean;
  _count: { _all: number };
};

export function toSubmissionCounts(
  groups: Group[],
): Record<string, SubmissionCounts> {
  const out: Record<string, SubmissionCounts> = {};
  for (const g of groups) {
    const c = (out[g.assignmentId] ??= { ...EMPTY_COUNTS });
    const n = g._count._all;
    c.studentAssign += n;
    if (g.status === 'SUBMITTED') c.summitNumber += n;
    if (g.status === 'PENDDING' && g.isAssigned) c.penddingNumber += n;
    if (g.status === 'REVIEWD') c.reviewNumber += n;
  }
  return out;
}
