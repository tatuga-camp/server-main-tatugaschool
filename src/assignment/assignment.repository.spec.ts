import { AssignmentRepository } from './assignment.repository';

const OMIT_EMBEDDING = { vector: true, vectorResouce: true };

describe('AssignmentRepository embedding projection', () => {
  let repository: AssignmentRepository;

  const mockPrisma = {
    assignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedis = {
    hget: jest.fn(),
    hset: jest.fn(),
    expire: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(() => {
    repository = new AssignmentRepository(
      mockPrisma as any,
      {} as any,
      mockRedis as any,
    );
    mockPrisma.assignment.findUnique.mockResolvedValue({ id: 'a1' });
    mockPrisma.assignment.findMany.mockResolvedValue([{ id: 'a1' }]);
    mockPrisma.assignment.update.mockResolvedValue({
      id: 'a1',
      subjectId: 's1',
    });
    mockRedis.hget.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getById omits vector and vectorResouce by default', async () => {
    await repository.getById({ assignmentId: 'a1' });

    expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
      omit: OMIT_EMBEDDING,
    });
  });

  it('getById returns the embedding when withVector is set', async () => {
    await repository.getById({ assignmentId: 'a1', withVector: true });

    expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
    });
  });

  it('findMany omits embedding fields on uncached queries', async () => {
    await repository.findMany({ where: { id: { in: ['a1', 'a2'] } } });

    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] } },
      omit: OMIT_EMBEDDING,
    });
  });

  it('findMany omits embedding fields on subject-cached queries and keys the cache by the projection', async () => {
    await repository.findMany({ where: { subjectId: 's1' } });

    const expected = { where: { subjectId: 's1' }, omit: OMIT_EMBEDDING };
    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(expected);
    expect(mockRedis.hget).toHaveBeenCalledWith(
      'assignment_subjectId:s1',
      JSON.stringify(expected),
    );
  });

  it('findMany respects a caller-provided select', async () => {
    const request = { where: { id: 'a1' }, select: { id: true } };
    await repository.findMany(request);

    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(request);
  });

  it('update omits embedding fields from the returned document', async () => {
    await repository.update({ where: { id: 'a1' }, data: { order: 1 } });

    expect(mockPrisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { order: 1 },
      omit: OMIT_EMBEDDING,
    });
  });
});
