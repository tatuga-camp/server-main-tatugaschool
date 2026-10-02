import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import {
  ALL_SUBJECT_SCOPE_KINDS,
  schoolMembersScope,
  subjectScope,
} from '../cache-scopes';
import { SubjectRepository } from '../../subject/subject.repository';
import { StudentOnSubjectRepository } from '../../student-on-subject/student-on-subject.repository';
import { TeacherOnSubjectRepository } from '../../teacher-on-subject/teacher-on-subject.repository';
import { MemberOnSchoolRepository } from '../../member-on-school/member-on-school.repository';

// The stub returns the same record for every model, so id is 's1' and the
// Subject cases see result.id === 's1'.
const record = {
  id: 's1',
  subjectId: 's1',
  schoolId: 'sch1',
  userId: 'u1',
  contentType: 'TEXT',
  body: '',
};
const storage = { DeleteFileOnStorage: jest.fn() } as any;
const R = subjectScope('s1', 'roster');
const all = ALL_SUBJECT_SCOPE_KINDS.map((k) => subjectScope('s1', k));

type Case = {
  name: string;
  run: (cache: any, prisma: any) => Promise<unknown>;
  scopes: string[];
};

const cases: Case[] = [
  {
    name: 'Subject.createSubject',
    run: (c, p) =>
      new SubjectRepository(p, storage, p, c).createSubject({
        data: {},
      } as any),
    scopes: [R],
  },
  {
    name: 'Subject.update',
    run: (c, p) =>
      new SubjectRepository(p, storage, p, c).update({
        where: { id: 's1' },
        data: {},
      }),
    scopes: [R],
  },
  {
    name: 'Subject.reorderSubjects',
    run: (c, p) =>
      new SubjectRepository(p, storage, p, c).reorderSubjects({
        subjectIds: ['s1'],
      } as any),
    scopes: [R],
  },
  {
    name: 'Subject.updateMany',
    run: (c, p) =>
      new SubjectRepository(p, storage, p, c).updateMany(
        { where: { id: { in: ['s1'] } }, data: {} },
        ['s1'],
      ),
    scopes: [R],
  },
  {
    name: 'Subject.deleteSubject',
    run: (c, p) =>
      new SubjectRepository(p, storage, p, c).deleteSubject({
        subjectId: 's1',
      }),
    scopes: all,
  },
  {
    name: 'SoS.create',
    run: (c, p) =>
      new StudentOnSubjectRepository(p, storage, c, p).createStudentOnSubject(
        {} as any,
      ),
    scopes: [R],
  },
  {
    name: 'SoS.createMany',
    run: (c, p) =>
      new StudentOnSubjectRepository(p, storage, c, p).createMany({
        data: [{ subjectId: 's1' } as any],
      }),
    scopes: [R],
  },
  {
    name: 'SoS.updateStudentOnSubject',
    run: (c, p) =>
      new StudentOnSubjectRepository(p, storage, c, p).updateStudentOnSubject({
        query: { studentOnSubjectId: 'r1' },
        data: {},
      } as any),
    scopes: [R],
  },
  {
    name: 'SoS.update',
    run: (c, p) =>
      new StudentOnSubjectRepository(p, storage, c, p).update({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [R],
  },
  {
    name: 'SoS.delete',
    run: (c, p) =>
      new StudentOnSubjectRepository(p, storage, c, p).delete({
        studentOnSubjectId: 'r1',
      }),
    scopes: [
      R,
      subjectScope('s1', 'attendance'),
      subjectScope('s1', 'grades'),
      subjectScope('s1', 'submissions'),
    ],
  },
  {
    name: 'ToS.create',
    run: (c, p) => new TeacherOnSubjectRepository(p, c).create({} as any),
    scopes: [R],
  },
  {
    name: 'ToS.update',
    run: (c, p) =>
      new TeacherOnSubjectRepository(p, c).update({
        query: { teacherOnSubjectId: 'r1' },
        body: {},
      } as any),
    scopes: [R],
  },
  {
    name: 'ToS.delete',
    run: (c, p) =>
      new TeacherOnSubjectRepository(p, c).delete({
        teacherOnSubjectId: 'r1',
      }),
    scopes: [R],
  },
  {
    name: 'MoS.create',
    run: (c, p) => new MemberOnSchoolRepository(p, c).create({} as any),
    scopes: [schoolMembersScope('sch1')],
  },
  {
    name: 'MoS.update',
    run: (c, p) =>
      new MemberOnSchoolRepository(p, c).updateMemberOnSchool({
        query: { memberOnSchoolId: 'r1' },
        data: {},
      } as any),
    scopes: [schoolMembersScope('sch1')],
  },
  {
    name: 'MoS.delete',
    run: (c, p) =>
      new MemberOnSchoolRepository(p, c).delete({ memberOnSchoolId: 'r1' }),
    scopes: [schoolMembersScope('sch1'), R],
  },
];

describe('roster and school-member repositories bump after writes', () => {
  it.each(cases)('$name', async ({ run, scopes }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record));
    const bumped = (cache.bump as jest.Mock).mock.calls.flat();
    for (const scope of scopes) expect(bumped).toContain(scope);
  });

  it('SoS.createMany with empty data bumps nothing and does not throw', async () => {
    const cache = createPassthroughCache();
    await new StudentOnSubjectRepository(
      createPrismaStub(record),
      storage,
      cache,
      createPrismaStub(record),
    ).createMany({ data: [] });
    expect(cache.bump).not.toHaveBeenCalled();
  });
});

describe('no bump when the write throws', () => {
  it.each(cases)('$name', async ({ run }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record, { failWrites: true })).catch(
      () => undefined,
    );
    expect(cache.bump).not.toHaveBeenCalled();
  });
});

describe('roster edge cases', () => {
  it('MoS.delete bumps the roster of every subject the teacher was removed from', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      memberOnSchool: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'm1', userId: 'u1', schoolId: 'sch1' }),
        delete: jest.fn().mockResolvedValue({ id: 'm1', schoolId: 'sch1' }),
      },
      teacherOnSubject: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ subjectId: 's1' }, { subjectId: 's2' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    await new MemberOnSchoolRepository(prisma, cache).delete({
      memberOnSchoolId: 'm1',
    });
    const bumped = (cache.bump as jest.Mock).mock.calls.flat();
    expect(bumped).toEqual(
      expect.arrayContaining([
        schoolMembersScope('sch1'),
        subjectScope('s1', 'roster'),
        subjectScope('s2', 'roster'),
      ]),
    );
  });

  it('MoS.delete of a member without a user bumps only the school members', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      memberOnSchool: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'm1', userId: null, schoolId: 'sch1' }),
        delete: jest.fn().mockResolvedValue({ id: 'm1', schoolId: 'sch1' }),
      },
      teacherOnSubject: { findMany: jest.fn(), deleteMany: jest.fn() },
    };
    await new MemberOnSchoolRepository(prisma, cache).delete({
      memberOnSchoolId: 'm1',
    });
    expect((cache.bump as jest.Mock).mock.calls.flat()).toEqual([
      schoolMembersScope('sch1'),
    ]);
  });

  it('Subject.updateMany bumps every listed subject, and nothing for an empty list', async () => {
    const cache = createPassthroughCache();
    const repo = new SubjectRepository(
      createPrismaStub(record),
      storage,
      createPrismaStub(record),
      cache,
    );
    await repo.updateMany({ where: {}, data: {} }, []);
    expect(cache.bump).not.toHaveBeenCalled();
    await repo.updateMany({ where: {}, data: {} }, ['s1', 's2']);
    expect(cache.bump).toHaveBeenCalledWith(
      subjectScope('s1', 'roster'),
      subjectScope('s2', 'roster'),
    );
  });

  it('Subject.reorderSubjects bumps the roster of each reordered subject', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      subject: {
        update: jest.fn(async ({ where }) => ({ id: where.id })),
      },
    };
    await new SubjectRepository(prisma, storage, prisma, cache).reorderSubjects(
      { subjectIds: ['s1', 's2'] } as any,
    );
    expect(cache.bump).toHaveBeenCalledWith(
      subjectScope('s1', 'roster'),
      subjectScope('s2', 'roster'),
    );
  });
});
