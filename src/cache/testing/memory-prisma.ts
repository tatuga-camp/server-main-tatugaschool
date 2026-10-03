// An in-memory stand-in for the primary Prisma client, for tests that run a
// service against a real CacheService (createTestCache). Rows live in plain
// arrays the test can edit; every read is a jest mock, so a test can count what
// reached Atlas. It supports the query shapes the cached loaders use: equality
// and `{ in: [...] }` filters, `select`, `omit` and a one-key `orderBy`.
export type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;

// What a client receives: the HTTP layer serialises responses with JSON.
export const json = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, value]) =>
    value !== null && typeof value === 'object' && Array.isArray(value.in)
      ? value.in.includes(row[key])
      : row[key] === value,
  );
}

export function project(row: Row, args: Row = {}): Row {
  if (args.select) {
    return Object.fromEntries(
      Object.keys(args.select)
        .filter((key) => args.select[key])
        .map((key) => [key, row[key]]),
    );
  }
  const out = { ...row };
  for (const key of Object.keys(args.omit ?? {})) delete out[key];
  return out;
}

function ordered(rows: Row[], orderBy?: Row): Row[] {
  if (!orderBy) return rows;
  const [[key, direction]] = Object.entries(orderBy);
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) =>
    a[key] > b[key] ? sign : a[key] < b[key] ? -sign : 0,
  );
}

function table(rows: () => Row[]) {
  const find = (args: Row = {}) =>
    ordered(
      rows().filter((row) => matches(row, args.where)),
      args.orderBy,
    ).map((row) => project(row, args));
  return {
    findMany: jest.fn(async (args?: Row) => find(args)),
    findFirst: jest.fn(async (args?: Row) => find(args)[0] ?? null),
    findUnique: jest.fn(async (args?: Row) => find(args)[0] ?? null),
  };
}

// A MemberOnSchool row as findRaw returns it (extended JSON). The real
// ValidateAccess reads members through findFirstMemberOnSchoolByUser.
function rawMember(member: Row) {
  return {
    _id: { $oid: member.id },
    createAt: { $date: '2026-01-01T00:00:00.000Z' },
    updateAt: { $date: '2026-01-01T00:00:00.000Z' },
    status: member.status,
    role: member.role,
    email: `${member.id}@school.test`,
    userId: { $oid: member.userId },
    schoolId: { $oid: member.schoolId },
  };
}

// Tables are read lazily, so a test may replace `db.<table>` between calls.
export function memoryPrisma(db: Tables): Record<string, any> {
  const prisma: Record<string, any> = {};
  for (const name of Object.keys(db)) prisma[name] = table(() => db[name]);
  if (db.memberOnSchool) {
    prisma.memberOnSchool.findRaw = jest.fn(async ({ filter }: Row) =>
      db.memberOnSchool
        .filter(
          (m) =>
            m.userId === filter.userId?.$oid &&
            (filter.schoolId === undefined ||
              m.schoolId === filter.schoolId.$oid),
        )
        .map(rawMember),
    );
  }
  return prisma;
}

// Teachers of school sch1 and their standing on subject s1: u1 teaches s1, u2
// teaches only s2, u3 is a school admin, u4 was invited to s1 but has not
// accepted, and u5 is not a member of the school.
export function accessRows(): Tables {
  return {
    memberOnSchool: [
      { id: 'm1', userId: 'u1', schoolId: 'sch1', role: 'TEACHER' },
      { id: 'm2', userId: 'u2', schoolId: 'sch1', role: 'TEACHER' },
      { id: 'm3', userId: 'u3', schoolId: 'sch1', role: 'ADMIN' },
      { id: 'm4', userId: 'u4', schoolId: 'sch1', role: 'TEACHER' },
    ].map((m) => ({ ...m, status: 'ACCEPT' })),
    teacherOnSubject: [
      { id: 'tos1', userId: 'u1', subjectId: 's1', status: 'ACCEPT' },
      { id: 'tos2', userId: 'u2', subjectId: 's2', status: 'ACCEPT' },
      { id: 'tos4', userId: 'u4', subjectId: 's1', status: 'PENDDING' },
    ],
  };
}

// Callers the real ValidateAccess must refuse on subject s1, with its message.
export const REFUSED_TEACHERS: [string, string, string][] = [
  ['who teaches only s2', 'u2', "You're not a teacher on this subject"],
  ['with an unaccepted invite', 'u4', "You're not a teacher on this subject"],
  ['outside the school', 'u5', "You're not a member of this school"],
];
