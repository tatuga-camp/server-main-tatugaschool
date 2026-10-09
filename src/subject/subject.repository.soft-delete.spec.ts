import { SubjectRepository } from './subject.repository';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';

// A prisma stand-in whose every model method resolves: findMany to [],
// everything else to a row with the subject id.
function fakePrisma() {
  return new Proxy(
    {},
    {
      get: () =>
        new Proxy(
          {},
          {
            get: (_t, method: string) =>
              jest
                .fn()
                .mockResolvedValue(method === 'findMany' ? [] : { id: 'sub1' }),
          },
        ),
    },
  );
}

describe('SubjectRepository hard delete includes soft-deleted assignments', () => {
  let repository: SubjectRepository;
  let assignmentRepository: {
    findMany: jest.Mock;
    getTotalDeleteSize: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    repository = new SubjectRepository(
      fakePrisma() as any,
      {} as any,
      {} as any,
      createPassthroughCache(),
    );
    assignmentRepository = {
      findMany: jest.fn().mockResolvedValue([{ id: 'a1' }]),
      getTotalDeleteSize: jest.fn().mockResolvedValue(10),
      delete: jest.fn().mockResolvedValue({ totalDeleteSize: 10 }),
    };
    (repository as any).assignmentRepository = assignmentRepository;
    (repository as any).groupOnSubjectRepository = {
      findMany: jest.fn().mockResolvedValue([]),
    };
  });

  it('getTotalDeleteSize reads assignments with includeDeleted', async () => {
    await repository.getTotalDeleteSize({ subjectId: 'sub1' });

    expect(assignmentRepository.findMany).toHaveBeenCalledWith(
      { where: { subjectId: 'sub1' } },
      { includeDeleted: true },
    );
  });

  it('deleteSubject reads and hard deletes soft-deleted assignments', async () => {
    const result = await repository.deleteSubject({ subjectId: 'sub1' });

    expect(assignmentRepository.findMany).toHaveBeenCalledTimes(2);
    for (const call of assignmentRepository.findMany.mock.calls) {
      expect(call[1]).toEqual({ includeDeleted: true });
    }
    expect(assignmentRepository.delete).toHaveBeenCalledWith({
      assignmentId: 'a1',
    });
    expect(result.totalDeleteSize).toBe(10);
  });
});
