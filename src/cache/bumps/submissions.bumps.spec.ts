import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import { subjectScope } from '../cache-scopes';
import { StudentOnAssignmentRepository } from '../../student-on-assignment/student-on-assignment.repository';
import { FileOnStudentAssignmentRepository } from '../../file-on-student-assignment/file-on-student-assignment.repository';
import { CommentAssignmentRepository } from '../../comment-assignment/comment-assignment.repository';

const record = {
  id: 'r1',
  subjectId: 's1',
  schoolId: 'sch1',
  assignmentId: 'a1',
  attendanceTableId: 't1',
  studentOnAssignmentId: 'soa1',
  title: 'x',
  contentType: 'TEXT',
  body: '',
};
const storage = { DeleteFileOnStorage: jest.fn() } as any;
const S = subjectScope('s1', 'submissions');

type Case = {
  name: string;
  run: (cache: any, prisma: any) => Promise<unknown>;
  scopes: string[];
};

const cases: Case[] = [
  {
    name: 'SoA.create',
    run: (c, p) =>
      new StudentOnAssignmentRepository(p, c).create({ data: {} } as any),
    scopes: [S],
  },
  {
    name: 'SoA.createMany',
    run: (c, p) =>
      new StudentOnAssignmentRepository(p, c).createMany({
        data: [{ subjectId: 's1' } as any],
      }),
    scopes: [S],
  },
  {
    name: 'SoA.update',
    run: (c, p) =>
      new StudentOnAssignmentRepository(p, c).update({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [S],
  },
  {
    name: 'SoA.updateMany',
    run: (c, p) =>
      new StudentOnAssignmentRepository(p, c).updateMany(
        { where: { assignmentId: 'a1' }, data: {} },
        's1',
      ),
    scopes: [S],
  },
  {
    name: 'SoA.delete',
    run: (c, p) =>
      new StudentOnAssignmentRepository(p, c).delete({
        studentOnAssignmentId: 'r1',
      }),
    scopes: [S],
  },
  {
    name: 'SoA.deleteByAssignmentId',
    run: (c, p) =>
      new StudentOnAssignmentRepository(p, c).deleteByAssignmentId({
        assignmentId: 'a1',
        subjectId: 's1',
      }),
    scopes: [S],
  },
  {
    name: 'FileOnSA.create',
    run: (c, p) =>
      new FileOnStudentAssignmentRepository(p, storage, c).create({
        data: {} as any,
      }),
    scopes: [S],
  },
  {
    name: 'FileOnSA.update',
    run: (c, p) =>
      new FileOnStudentAssignmentRepository(p, storage, c).update({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [S],
  },
  {
    name: 'FileOnSA.delete',
    run: (c, p) =>
      new FileOnStudentAssignmentRepository(p, storage, c).delete({
        fileOnStudentAssignmentId: 'r1',
      }),
    scopes: [S],
  },
  {
    name: 'FileOnSA.deleteMany',
    run: (c, p) =>
      new FileOnStudentAssignmentRepository(p, storage, c).deleteMany({
        where: { assignmentId: 'a1' },
      }),
    scopes: [S],
  },
  {
    name: 'Comment.create',
    run: (c, p) => new CommentAssignmentRepository(p, c).create({} as any),
    scopes: [S],
  },
  {
    name: 'Comment.update',
    run: (c, p) =>
      new CommentAssignmentRepository(p, c).update({
        query: { commentOnAssignmentId: 'r1' },
        body: {},
      } as any),
    scopes: [S],
  },
  {
    name: 'Comment.delete',
    run: (c, p) =>
      new CommentAssignmentRepository(p, c).delete({
        commentOnAssignmentId: 'r1',
      } as any),
    scopes: [S],
  },
];

describe('submissions-scope repositories bump after writes', () => {
  it.each(cases)('$name', async ({ run, scopes }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record));
    for (const scope of scopes) expect(cache.bump).toHaveBeenCalledWith(scope);
  });

  it('FileOnSA.deleteMany with no matching rows bumps nothing', async () => {
    const cache = createPassthroughCache();
    const prisma: any = {
      fileOnStudentAssignment: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    await new FileOnStudentAssignmentRepository(
      prisma,
      storage,
      cache,
    ).deleteMany({ where: { assignmentId: 'a1' } });
    expect(cache.bump).not.toHaveBeenCalled();
  });
});
