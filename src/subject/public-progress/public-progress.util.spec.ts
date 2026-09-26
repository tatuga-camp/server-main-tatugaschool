import {
  assignmentContribution,
  buildPublicProgress,
  DEFAULT_GRADE_RULES,
  firstTag,
  gradeFor,
  parseGradeRules,
  PublicProgressInputs,
  specialContribution,
  withoutPublicProgressToken,
} from './public-progress.util';

const NOW = new Date('2026-09-25T07:05:00.000Z');

function fixture(): PublicProgressInputs {
  return {
    subject: { title: 'Math', educationYear: '1/2026', backgroundImage: 'https://cdn.example/banner.jpg' },
    className: 'M.1/2',
    assignments: [
      { id: 'a1', title: 'Worksheet 1', tags: ['Unit 1'], maxScore: 10, weight: null, allowStudentViewScore: true },
      { id: 'a2', title: 'Quiz 1', tags: [' Unit 1 ', 'Extra'], maxScore: 20, weight: 10, allowStudentViewScore: true },
      { id: 'a3', title: 'Secret test', tags: ['Unit 2'], maxScore: 10, weight: null, allowStudentViewScore: false },
      { id: 'a4', title: 'Free write', tags: [], maxScore: 5, weight: null, allowStudentViewScore: true },
    ],
    studentOnAssignments: [
      { assignmentId: 'a1', studentOnSubjectId: 'bee', status: 'REVIEWD', score: 8 },
      { assignmentId: 'a2', studentOnSubjectId: 'bee', status: 'REVIEWD', score: 16 },
      { assignmentId: 'a3', studentOnSubjectId: 'bee', status: 'REVIEWD', score: 9 },
      { assignmentId: 'a4', studentOnSubjectId: 'bee', status: 'PENDDING', score: null },
      { assignmentId: 'a1', studentOnSubjectId: 'ann', status: 'SUBMITTED', score: null },
      { assignmentId: 'a3', studentOnSubjectId: 'ann', status: 'PENDDING', score: null },
      { assignmentId: 'a4', studentOnSubjectId: 'ann', status: 'IMPROVED', score: 3 },
    ],
    scoreOnSubjects: [{ id: 's1', title: 'Behaviour', maxScore: 10, weight: null }],
    scoreOnStudents: [
      { scoreOnSubjectId: 's1', studentOnSubjectId: 'bee', score: 4 },
      { scoreOnSubjectId: 's1', studentOnSubjectId: 'bee', score: 3 },
    ],
    studentOnSubjects: [
      { id: 'bee', number: '2', title: 'Ms', firstName: 'Bee', lastName: 'B', photo: 'p-bee', blurHash: null, isActive: true },
      { id: 'ann', number: '1', title: 'Ms', firstName: 'Ann', lastName: 'A', photo: 'p-ann', blurHash: 'bh', isActive: true },
      { id: 'cat', number: '3', title: 'Mr', firstName: 'Cat', lastName: 'C', photo: 'p-cat', blurHash: null, isActive: false },
    ],
    gradeRules: JSON.stringify([
      { min: 30, max: 100, grade: 'A' },
      { min: 0, max: 29, grade: 'F' },
    ]),
    now: NOW,
  };
}

describe('public-progress helpers', () => {
  it('firstTag trims and treats blank as untagged', () => {
    expect(firstTag([' Unit 1 ', 'x'])).toBe('Unit 1');
    expect(firstTag(['  ', 'x'])).toBeNull();
    expect(firstTag([])).toBeNull();
    expect(firstTag(undefined)).toBeNull();
  });

  it('assignmentContribution weights, defaults null score to 0, and never returns NaN', () => {
    expect(assignmentContribution(8, 10, null)).toBe(8);
    expect(assignmentContribution(16, 20, 10)).toBe(8);
    expect(assignmentContribution(null, 10, null)).toBe(0);
    expect(assignmentContribution(5, 0, 10)).toBe(0);
    expect(assignmentContribution(5, null, 10)).toBe(0);
  });

  it('specialContribution caps at maxScore (default 100) when weighted', () => {
    expect(specialContribution(7, 10, null)).toBe(7);
    expect(specialContribution(15, 10, 20)).toBe(20);
    expect(specialContribution(50, null, 10)).toBe(5);
  });

  it('parseGradeRules falls back to defaults on bad input', () => {
    expect(parseGradeRules('not json')).toBe(DEFAULT_GRADE_RULES);
    expect(parseGradeRules(null)).toBe(DEFAULT_GRADE_RULES);
    expect(parseGradeRules([{ min: 0, max: 100, grade: 'P' }])).toEqual([
      { min: 0, max: 100, grade: 'P' },
    ]);
  });

  it('parseGradeRules keeps an empty stored list (grade N/A, like the teacher table)', () => {
    expect(parseGradeRules('[]')).toEqual([]);
    expect(gradeFor(parseGradeRules('[]'), 90)).toBe('N/A');
  });

  it('withoutPublicProgressToken clears the token and keeps everything else', () => {
    const subject = { id: 's1', title: 'Math', publicProgressToken: 'a'.repeat(32) };
    expect(withoutPublicProgressToken(subject)).toEqual({
      id: 's1',
      title: 'Math',
      publicProgressToken: null,
    });
    expect(subject.publicProgressToken).toBe('a'.repeat(32)); // not mutated
  });

  it('gradeFor picks the highest matching min', () => {
    expect(gradeFor(DEFAULT_GRADE_RULES, 85)).toBe('4');
    expect(gradeFor(DEFAULT_GRADE_RULES, 52)).toBe('1');
    expect(gradeFor([{ min: 50, max: 100, grade: 'P' }], 10)).toBe('N/A');
  });
});

describe('buildPublicProgress', () => {
  it('STATUS: statuses only — no scores, totals, grade or special columns anywhere', () => {
    const result = buildPublicProgress(fixture(), 'STATUS');
    const json = JSON.stringify(result);
    for (const key of ['"score"', '"total"', '"groupTotals"', '"grade"', '"maxTotal"', '"maxScore"', '"weight"']) {
      expect(json).not.toContain(key);
    }
    expect(result.columns.map((c) => c.id)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(result.students.map((s) => s.id)).toEqual(['ann', 'bee']); // sorted by number, inactive dropped
    const ann = result.students[0];
    expect(ann.cells).toEqual({
      a1: { status: 'SUBMITTED' },
      a2: { status: 'NONE' },
      a3: { status: 'PENDDING' },
      a4: { status: 'IMPROVED' },
    });
    expect(ann.submittedCount).toBe(2);
    expect(ann.assignedCount).toBe(3);
    expect(result.students[1].submittedCount).toBe(3);
    expect(result.students[1].assignedCount).toBe(4);
    expect(result.subject).toEqual({
      title: 'Math',
      educationYear: '1/2026',
      className: 'M.1/2',
      backgroundImage: 'https://cdn.example/banner.jpg',
    });
    expect(result.updatedAt).toBe(NOW.toISOString());
  });

  it('groups by first tag in first-appearance order', () => {
    const result = buildPublicProgress(fixture(), 'STATUS');
    expect(result.groups).toEqual([
      { tag: 'Unit 1', assignmentIds: ['a1', 'a2'] },
      { tag: 'Unit 2', assignmentIds: ['a3'] },
    ]);
    expect(result.columns.find((c) => c.id === 'a4')).toMatchObject({ tag: null });
  });

  it('SCORE: visible scores + totals, hidden score never sent and excluded from totals, no grade', () => {
    const result = buildPublicProgress(fixture(), 'SCORE');
    const bee = result.students.find((s) => s.id === 'bee')!;
    expect(bee.cells.a1).toEqual({ status: 'REVIEWD', score: 8 });
    expect(bee.cells.a2).toEqual({ status: 'REVIEWD', score: 8 });
    expect(bee.cells.a3).toEqual({ status: 'REVIEWD' });
    expect(bee.cells.a4).toEqual({ status: 'PENDDING' });
    expect(bee.cells.s1).toEqual({ status: 'REVIEWD', score: 7 });
    expect(bee.groupTotals).toEqual({ 'Unit 1': 16, 'Unit 2': 0 });
    expect(bee.total).toBe(23);
    expect(bee).not.toHaveProperty('grade');
    const ann = result.students.find((s) => s.id === 'ann')!;
    expect(ann.cells.s1).toEqual({ status: 'NONE' });
    expect(ann.total).toBe(3); // IMPROVED score counts toward total like the teacher table
    expect(result.maxTotal).toBe(25);
    expect(result.groups).toEqual([
      { tag: 'Unit 1', assignmentIds: ['a1', 'a2'], maxTotal: 20 },
      { tag: 'Unit 2', assignmentIds: ['a3'], maxTotal: 0 },
    ]);
    expect(result.columns.find((c) => c.id === 'a3')).toMatchObject({ scoreHidden: true });
    expect(result.columns.find((c) => c.id === 's1')).toMatchObject({ kind: 'special', maxScore: 10, weight: null });
    expect(JSON.stringify(result)).not.toContain('"score":9');
  });

  it('GRADE: grade uses the real total including hidden scores; hidden score still not sent', () => {
    const result = buildPublicProgress(fixture(), 'GRADE');
    const bee = result.students.find((s) => s.id === 'bee')!;
    expect(bee.total).toBe(23); // visible total
    expect(bee.grade).toBe('A'); // real total 32 ≥ 30; visible 23 would be 'F'
    expect(bee.cells.a3).toEqual({ status: 'REVIEWD' });
    expect(result.students.find((s) => s.id === 'ann')!.grade).toBe('F');
  });

  // Parity fixture — keep identical to the "parity fixture" test in
  // clients/client-main-tatugaschool/utils/gradeColumns.test.ts.
  it('parity fixture: Unit A subtotal is 12', () => {
    const inputs = fixture();
    inputs.assignments = [
      { id: 'p1', title: 'P1', tags: ['Unit A'], maxScore: 10, weight: null, allowStudentViewScore: true },
      { id: 'p2', title: 'P2', tags: ['Unit A'], maxScore: 20, weight: 10, allowStudentViewScore: true },
    ];
    inputs.studentOnAssignments = [
      { assignmentId: 'p1', studentOnSubjectId: 'ann', status: 'REVIEWD', score: 7 },
      { assignmentId: 'p2', studentOnSubjectId: 'ann', status: 'REVIEWD', score: 10 },
    ];
    inputs.scoreOnSubjects = [];
    inputs.scoreOnStudents = [];
    const ann = buildPublicProgress(inputs, 'SCORE').students.find((s) => s.id === 'ann')!;
    expect(ann.groupTotals).toEqual({ 'Unit A': 12 });
  });
});
