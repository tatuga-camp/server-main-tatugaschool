import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import { subjectScope } from '../cache-scopes';
import { AssignmentVideoQuizRepository } from '../../assignment-video-quiz/assignment-video-quiz.repository';
import { StudentOnAssignmentRepository } from '../../student-on-assignment/student-on-assignment.repository';
import { StudentOnSubjectRepository } from '../../student-on-subject/student-on-subject.repository';

const record = { id: 'r1', subjectId: 's1' };
const storage = { DeleteFileOnStorage: jest.fn() } as any;
const batch = [
  { subjectId: 's1' },
  { subjectId: 's2' },
  { subjectId: 's1' },
] as any;

function bumpedScopes(cache: any): string[] {
  return (cache.bump as jest.Mock).mock.calls.flat();
}

describe('createMany bumps every subject in the batch', () => {
  it('QuestionOnVideo.createMany', async () => {
    const cache = createPassthroughCache();
    await new AssignmentVideoQuizRepository(
      createPrismaStub(record),
      cache,
    ).createMany({ data: batch });
    expect(bumpedScopes(cache).sort()).toEqual(
      [
        subjectScope('s1', 'assignments'),
        subjectScope('s2', 'assignments'),
      ].sort(),
    );
  });

  it('StudentOnAssignment.createMany', async () => {
    const cache = createPassthroughCache();
    await new StudentOnAssignmentRepository(
      createPrismaStub(record),
      cache,
    ).createMany({ data: batch });
    expect(bumpedScopes(cache).sort()).toEqual(
      [
        subjectScope('s1', 'submissions'),
        subjectScope('s2', 'submissions'),
      ].sort(),
    );
  });

  it('StudentOnSubject.createMany', async () => {
    const cache = createPassthroughCache();
    const prisma = createPrismaStub(record);
    await new StudentOnSubjectRepository(
      prisma,
      storage,
      cache,
      prisma,
    ).createMany({ data: batch });
    expect(bumpedScopes(cache).sort()).toEqual(
      [subjectScope('s1', 'roster'), subjectScope('s2', 'roster')].sort(),
    );
  });
});
