import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import { subjectScope } from '../cache-scopes';
import { AssignmentRepository } from '../../assignment/assignment.repository';
import { FileAssignmentRepository } from '../../file-assignment/file-assignment.repository';
import { AssignmentVideoQuizRepository } from '../../assignment-video-quiz/assignment-video-quiz.repository';
import { SkillOnAssignmentRepository } from '../../skill-on-assignment/skill-on-assignment.repository';

const record = {
  id: 'r1',
  subjectId: 's1',
  assignmentId: 'a1',
  url: 'u',
  size: 1,
  contentType: 'TEXT',
  body: '',
};
const storage = { DeleteFileOnStorage: jest.fn() } as any;
const A = subjectScope('s1', 'assignments');
const S = subjectScope('s1', 'submissions');

type Case = {
  name: string;
  run: (cache: any, prisma: any) => Promise<unknown>;
  scopes: string[];
};

const cases: Case[] = [
  {
    name: 'Assignment.create',
    run: (c, p) =>
      new AssignmentRepository(p, storage, c).create({ data: {} as any }),
    scopes: [A],
  },
  {
    name: 'Assignment.update',
    run: (c, p) =>
      new AssignmentRepository(p, storage, c).update({
        where: { id: 'a1' },
        data: {},
      }),
    scopes: [A],
  },
  {
    name: 'Assignment.delete',
    run: (c, p) =>
      new AssignmentRepository(p, storage, c).delete({ assignmentId: 'a1' }),
    scopes: [A, S],
  },
  {
    name: 'FileAssignment.create',
    run: (c, p) =>
      new FileAssignmentRepository(p, storage, c).create({} as any),
    scopes: [A],
  },
  {
    name: 'FileAssignment.update',
    run: (c, p) =>
      new FileAssignmentRepository(p, storage, c).update({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [A],
  },
  {
    name: 'FileAssignment.delete',
    run: (c, p) =>
      new FileAssignmentRepository(p, storage, c).delete({
        fileOnAssignmentId: 'r1',
      }),
    scopes: [A],
  },
  {
    name: 'FileAssignment.deleteByAssignmentId',
    run: (c, p) =>
      new FileAssignmentRepository(p, storage, c).deleteByAssignmentId({
        assignmentId: 'a1',
      }),
    scopes: [A],
  },
  {
    name: 'VideoQuiz.create',
    run: (c, p) =>
      new AssignmentVideoQuizRepository(p, c).create({ data: {} as any }),
    scopes: [A],
  },
  {
    name: 'VideoQuiz.update',
    run: (c, p) =>
      new AssignmentVideoQuizRepository(p, c).update({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [A],
  },
  {
    name: 'VideoQuiz.createMany',
    run: (c, p) =>
      new AssignmentVideoQuizRepository(p, c).createMany({
        data: [{ subjectId: 's1' } as any],
      }),
    scopes: [A],
  },
  {
    name: 'VideoQuiz.delete',
    run: (c, p) =>
      new AssignmentVideoQuizRepository(p, c).delete({ where: { id: 'r1' } }),
    scopes: [A],
  },
  {
    name: 'SkillOnAssignment.create',
    run: (c, p) =>
      new SkillOnAssignmentRepository(p, c).create({
        skillId: 'k',
        assignmentId: 'a1',
        subjectId: 's1',
      }),
    scopes: [A],
  },
  {
    name: 'SkillOnAssignment.delete',
    run: (c, p) => new SkillOnAssignmentRepository(p, c).delete({ id: 'r1' }),
    scopes: [A],
  },
  {
    name: 'SkillOnAssignment.deleteByAssignmentId',
    run: (c, p) =>
      new SkillOnAssignmentRepository(p, c).deleteByAssignmentId({
        assignmentId: 'a1',
        subjectId: 's1',
      }),
    scopes: [A],
  },
];

describe('assignments-scope repositories bump after writes', () => {
  it.each(cases)('$name', async ({ run, scopes }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record));
    const bumped = (cache.bump as jest.Mock).mock.calls.flat();
    expect(bumped).toEqual(expect.arrayContaining(scopes));
  });

  it('createMany with empty data bumps nothing and does not throw', async () => {
    const cache = createPassthroughCache();
    await new AssignmentVideoQuizRepository(
      createPrismaStub(record),
      cache,
    ).createMany({ data: [] });
    expect(cache.bump).not.toHaveBeenCalled();
  });

  it('does not bump when the write throws', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      assignment: { update: jest.fn().mockRejectedValue(new Error('db down')) },
    };
    await expect(
      new AssignmentRepository(prisma, storage, cache).update({
        where: { id: 'a1' },
        data: {},
      }),
    ).rejects.toThrow();
    expect(cache.bump).not.toHaveBeenCalled();
  });
});
