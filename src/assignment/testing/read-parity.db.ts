// In-memory tables and a Prisma fake for the read-parity spec.
export type Row = Record<string, any>;
export const d = (n: number) => new Date(Date.UTC(2026, 0, n));

export function seed() {
  const assignment: Row[] = [
    { id: 'a1', subjectId: 's1', type: 'Assignment', status: 'Published' },
    { id: 'a2', subjectId: 's1', type: 'VideoQuiz', status: 'Published' },
    { id: 'a3', subjectId: 's1', type: 'Material', status: 'Published' },
    { id: 'a4', subjectId: 's1', type: 'Assignment', status: 'Draft' },
    { id: 'a5', subjectId: 's1', type: 'Assignment', status: 'Published' },
    { id: 'b1', subjectId: 's2', type: 'Assignment', status: 'Published' },
  ].map((a, i) => ({
    ...a,
    schoolId: 'sch1',
    title: `T ${a.id}`,
    maxScore: 10,
    weight: null,
    createAt: d(i + 1),
    vector: [0.1, 0.2],
    vectorResouce: 'embedding',
  }));
  const soa = (
    id: string,
    assignmentId: string,
    sos: string,
    status: string,
    isAssigned: boolean,
    subjectId = 's1',
  ): Row => ({
    id,
    assignmentId,
    studentOnSubjectId: sos,
    studentId: sos.replace('sos', 'st'),
    subjectId,
    schoolId: 'sch1',
    status,
    isAssigned,
    score: status === 'REVIEWD' ? 8 : null,
    body: `answer ${id}`,
    title: 'Mr',
    firstName: `F ${sos}`,
    lastName: `L ${sos}`,
    photo: `p ${sos}`,
    blurHash: null,
    number: sos.slice(-1),
    completedAt: status === 'PENDDING' ? null : d(10),
    reviewdAt: status === 'REVIEWD' ? d(11) : null,
    createAt: d(5),
    updateAt: d(6),
  });
  const studentOnAssignment = [
    soa('x1', 'a1', 'sos1', 'REVIEWD', true),
    soa('x2', 'a1', 'sos2', 'SUBMITTED', true),
    soa('x3', 'a2', 'sos1', 'PENDDING', true),
    soa('x4', 'a2', 'sos2', 'PENDDING', false),
    soa('x5', 'a3', 'sos1', 'SUBMITTED', true),
    soa('x6', 'a4', 'sos1', 'PENDDING', true),
    soa('x7', 'a5', 'sos1', 'PENDDING', false),
    soa('x8', 'a5', 'sos2', 'REVIEWD', true),
    soa('y1', 'b1', 'sos9', 'SUBMITTED', true, 's2'),
  ];
  return {
    subject: [
      { id: 's1', schoolId: 'sch1', title: 'Math' },
      { id: 's2', schoolId: 'sch1', title: 'Art' },
    ],
    assignment,
    fileOnAssignment: [
      { id: 'f1', assignmentId: 'a1', url: 'u1' },
      { id: 'f2', assignmentId: 'a3', url: 'u2' },
      { id: 'f3', assignmentId: 'b1', url: 'u3' },
    ],
    questionOnVideo: [
      { id: 'q1', assignmentId: 'a2', question: 'why' },
      { id: 'q2', assignmentId: 'a1', question: 'stray' },
    ],
    studentOnAssignment,
    studentOnSubject: [
      { id: 'sos1', subjectId: 's1', studentId: 'st1', isActive: true },
      { id: 'sos2', subjectId: 's1', studentId: 'st2', isActive: true },
      { id: 'sos9', subjectId: 's2', studentId: 'st9', isActive: true },
    ],
    gradeRange: [
      {
        id: 'g1',
        subjectId: 's1',
        gradeRules: JSON.stringify([{ min: 0, max: 100, grade: 'A' }]),
      },
    ],
    scoreOnSubject: [
      { id: 'sc1', subjectId: 's1', title: 'Bonus', maxScore: 5, weight: 1 },
      { id: 'sc9', subjectId: 's2', title: 'Other', maxScore: 5, weight: 1 },
    ],
    scoreOnStudent: [
      {
        id: 'ss1',
        scoreOnSubjectId: 'sc1',
        studentOnSubjectId: 'sos1',
        subjectId: 's1',
        score: 3,
      },
      {
        id: 'ss2',
        scoreOnSubjectId: 'sc1',
        studentOnSubjectId: 'sos2',
        subjectId: 's1',
        score: 4,
      },
    ],
  };
}
export type Db = ReturnType<typeof seed>;

export function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, v]) =>
    v && typeof v === 'object' && Array.isArray(v.in)
      ? v.in.includes(row[k])
      : row[k] === v,
  );
}

export function project(row: Row, args: Row = {}): Row {
  if (args.select) {
    return Object.fromEntries(
      Object.keys(args.select)
        .filter((k) => args.select[k])
        .map((k) => [k, row[k]]),
    );
  }
  const out = { ...row };
  for (const k of Object.keys(args.omit ?? {})) delete out[k];
  return out;
}

export function fakePrisma(db: Db) {
  const table = (name: keyof Db) => ({
    findMany: jest.fn(async (args: Row = {}) =>
      (db[name] as Row[])
        .filter((r) => matches(r, args.where))
        .map((r) => project(r, args)),
    ),
    findFirst: jest.fn(async (args: Row = {}) => {
      const r = (db[name] as Row[]).find((x) => matches(x, args.where));
      return r ? project(r, args) : null;
    }),
    findUnique: jest.fn(async (args: Row = {}) => {
      const r = (db[name] as Row[]).find((x) => matches(x, args.where));
      return r ? project(r, args) : null;
    }),
    groupBy: jest.fn(async (args: Row) => {
      const groups = new Map<string, Row>();
      for (const r of (db[name] as Row[]).filter((x) =>
        matches(x, args.where),
      )) {
        const key = args.by.map((b: string) => String(r[b])).join('|');
        const g =
          groups.get(key) ??
          Object.fromEntries([
            ...args.by.map((b: string) => [b, r[b]]),
            ['_count', { _all: 0 }],
          ]);
        g._count._all++;
        groups.set(key, g);
      }
      return [...groups.values()];
    }),
  });
  return {
    subject: table('subject'),
    assignment: table('assignment'),
    fileOnAssignment: table('fileOnAssignment'),
    questionOnVideo: table('questionOnVideo'),
    studentOnAssignment: table('studentOnAssignment'),
    studentOnSubject: table('studentOnSubject'),
    gradeRange: table('gradeRange'),
    scoreOnSubject: table('scoreOnSubject'),
  };
}
