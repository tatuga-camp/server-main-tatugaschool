import { createPassthroughCache } from '../testing/cache-test-utils';
import { schoolMembersScope, subjectScope } from '../cache-scopes';
import { StudentRepository } from '../../student/student.repository';
import { UserRepository } from '../../users/users.repository';
import { SchoolRepository } from '../../school/school.repository';
import { SkillRepository } from '../../skill/skill.repository';

// Writes that update denormalized copies (a student's or user's name and photo)
// or cascade-delete cached rows must bump the scopes that hold those copies.

const bumped = (cache: any): string[] =>
  (cache.bump as jest.Mock).mock.calls.flat();

describe('denormalized-copy and cascade writes bump on write', () => {
  it('Student.update bumps submissions and grades of every subject the student is in', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      student: {
        update: jest.fn().mockResolvedValue({ id: 'st1', firstName: 'A' }),
      },
      studentOnSubject: {
        update: jest.fn(async ({ where }) => ({
          id: where.id,
          subjectId: where.id === 'sos1' ? 's1' : 's2',
        })),
      },
      studentOnAssignment: { updateMany: jest.fn() },
      scoreOnStudent: { updateMany: jest.fn() },
      studentOnGroup: { updateMany: jest.fn() },
      $runCommandRaw: jest.fn(),
    };
    const prismaRead: any = {
      studentOnSubject: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'sos1', subjectId: 's1' },
          { id: 'sos2', subjectId: 's2' },
        ]),
      },
    };
    await new StudentRepository(prisma, {} as any, prismaRead, cache).update({
      query: { studentId: 'st1' },
      body: {},
    } as any);
    expect(cache.bump).toHaveBeenCalledWith(
      subjectScope('s1', 'submissions'),
      subjectScope('s1', 'grades'),
      subjectScope('s2', 'submissions'),
      subjectScope('s2', 'grades'),
    );
  });

  it('Student.create bumps submissions of every subject it adds StudentOnAssignment rows to', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      student: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'st1', classId: 'c1', schoolId: 'sch1' }),
      },
      subject: {
        findMany: jest.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]),
      },
      studentOnSubject: {
        create: jest.fn(async ({ data }) => ({
          id: `sos-${data.subjectId}`,
          subjectId: data.subjectId,
        })),
      },
      assignment: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a1', subjectId: 's1' },
          { id: 'a2', subjectId: 's2' },
        ]),
      },
      studentOnAssignment: { create: jest.fn().mockResolvedValue({}) },
    };
    await new StudentRepository(prisma, {} as any, prisma, cache).create({
      classId: 'c1',
    } as any);
    expect(prisma.studentOnAssignment.create).toHaveBeenCalledTimes(2);
    expect(bumped(cache)).toEqual(
      expect.arrayContaining([
        subjectScope('s1', 'submissions'),
        subjectScope('s2', 'submissions'),
      ]),
    );
  });

  it('User.update bumps the members of each school and the roster and submissions of each taught subject', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      user: {
        update: jest.fn().mockResolvedValue({ id: 'u1', firstName: 'A' }),
      },
      memberOnSchool: {
        findRaw: jest.fn().mockResolvedValue([
          {
            _id: { $oid: 'm1' },
            createAt: { $date: '2026-01-01T00:00:00Z' },
            updateAt: { $date: '2026-01-01T00:00:00Z' },
            email: 'a@b.c',
            userId: { $oid: 'u1' },
            schoolId: { $oid: 'sch1' },
          },
        ]),
      },
      teacherOnSubject: {
        findMany: jest.fn().mockResolvedValue([{ subjectId: 's1' }]),
        updateMany: jest.fn(),
      },
      $runCommandRaw: jest.fn(),
    };
    await new UserRepository(prisma, cache).update({
      where: { id: 'u1' },
      data: {},
    });
    expect(prisma.memberOnSchool.findRaw).toHaveBeenCalledWith({
      filter: { userId: { $oid: 'u1' } },
    });
    expect(cache.bump).toHaveBeenCalledWith(
      schoolMembersScope('sch1'),
      subjectScope('s1', 'roster'),
      subjectScope('s1', 'submissions'),
    );
  });

  it('School.delete bumps the school members scope after deleting members', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      memberOnSchool: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      school: {
        delete: jest
          .fn()
          .mockResolvedValue({ id: 'sch1', stripe_customer_id: 'cus' }),
      },
    };
    const subjectService: any = {
      subjectRepository: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const classService: any = {
      classRepository: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const stripe: any = {
      customers: { del: jest.fn().mockResolvedValue({}) },
    };
    await new SchoolRepository(
      prisma,
      {} as any,
      subjectService,
      classService,
      stripe,
      cache,
    ).delete({ schoolId: 'sch1' });
    expect(bumped(cache)).toEqual([schoolMembersScope('sch1')]);
  });

  it('Skill.delete bumps assignments of every subject that used the skill', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      skillOnAssignment: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { subjectId: 's1' },
            { subjectId: 's1' },
            { subjectId: 's2' },
          ]),
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      skillOnCareer: { deleteMany: jest.fn() },
      skillOnStudentAssignment: { deleteMany: jest.fn() },
      skill: { delete: jest.fn().mockResolvedValue({ id: 'k1' }) },
    };
    await new SkillRepository(prisma, cache).delete({ skillId: 'k1' });
    expect(prisma.skillOnAssignment.findMany).toHaveBeenCalledWith({
      where: { skillId: 'k1' },
      select: { subjectId: true },
    });
    expect([...new Set(bumped(cache))]).toEqual([
      subjectScope('s1', 'assignments'),
      subjectScope('s2', 'assignments'),
    ]);
  });
});
