import { AssignmentRepository } from './assignment.repository';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';

const OMIT_EMBEDDING = { vector: true, vectorResouce: true };

describe('AssignmentRepository embedding projection', () => {
  let repository: AssignmentRepository;

  const mockPrisma = {
    assignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };
  let cache: ReturnType<typeof createPassthroughCache>;

  beforeEach(() => {
    cache = createPassthroughCache();
    repository = new AssignmentRepository(mockPrisma as any, {} as any, cache);
    mockPrisma.assignment.findUnique.mockResolvedValue({ id: 'a1' });
    mockPrisma.assignment.findMany.mockResolvedValue([{ id: 'a1' }]);
    mockPrisma.assignment.count.mockResolvedValue(1);
    mockPrisma.assignment.update.mockResolvedValue({
      id: 'a1',
      subjectId: 's1',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getById omits vector and vectorResouce by default', async () => {
    await repository.getById({ assignmentId: 'a1' });

    expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1', isDeleted: false },
      omit: OMIT_EMBEDDING,
    });
  });

  it('getById returns the embedding when withVector is set', async () => {
    await repository.getById({ assignmentId: 'a1', withVector: true });

    expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1', isDeleted: false },
    });
  });

  it('findMany omits embedding fields on uncached queries', async () => {
    await repository.findMany({ where: { id: { in: ['a1', 'a2'] } } });

    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] }, isDeleted: false },
      omit: OMIT_EMBEDDING,
    });
  });

  it('findMany respects a caller-provided select', async () => {
    const request = { where: { id: 'a1' }, select: { id: true } };
    await repository.findMany(request);

    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
      where: { id: 'a1', isDeleted: false },
      select: { id: true },
    });
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

describe('AssignmentRepository soft delete', () => {
  let repository: AssignmentRepository;
  let cache: ReturnType<typeof createPassthroughCache>;

  const mockPrisma = {
    assignment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    cache = createPassthroughCache();
    repository = new AssignmentRepository(mockPrisma as any, {} as any, cache);
    mockPrisma.assignment.findUnique.mockResolvedValue({ id: 'a1' });
    mockPrisma.assignment.findMany.mockResolvedValue([]);
    mockPrisma.assignment.count.mockResolvedValue(0);
    mockPrisma.assignment.update.mockResolvedValue({
      id: 'a1',
      subjectId: 's1',
      isDeleted: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('findMany hides deleted assignments by default', async () => {
    await repository.findMany({ where: { subjectId: 's1' } });

    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subjectId: 's1', isDeleted: false },
      }),
    );
  });

  it('findMany passes where unchanged with includeDeleted', async () => {
    await repository.findMany(
      { where: { subjectId: 's1' } },
      { includeDeleted: true },
    );

    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subjectId: 's1' } }),
    );
  });

  it('findMany adds the filter when no where is given', async () => {
    await repository.findMany({});

    expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDeleted: false } }),
    );
  });

  it('count hides deleted assignments by default', async () => {
    await repository.count({ where: { subjectId: 's1' } });

    expect(mockPrisma.assignment.count).toHaveBeenCalledWith({
      where: { subjectId: 's1', isDeleted: false },
    });
  });

  it('count passes where unchanged with includeDeleted', async () => {
    await repository.count(
      { where: { subjectId: 's1' } },
      { includeDeleted: true },
    );

    expect(mockPrisma.assignment.count).toHaveBeenCalledWith({
      where: { subjectId: 's1' },
    });
  });

  it('getById filters deleted assignments', async () => {
    await repository.getById({ assignmentId: 'a1' });

    expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1', isDeleted: false } }),
    );
  });

  it('getById reads deleted assignments with includeDeleted', async () => {
    await repository.getById({ assignmentId: 'a1', includeDeleted: true });

    expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' } }),
    );
  });

  it('softDelete flags the assignment and bumps its subject scopes', async () => {
    const result = await repository.softDelete('a1');

    expect(mockPrisma.assignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'a1' },
        data: { isDeleted: true, deletedAt: expect.any(Date) },
      }),
    );
    expect(cache.bump).toHaveBeenCalledWith(
      'subject:s1:assignments',
      'subject:s1:submissions',
    );
    expect(result).toEqual({ id: 'a1', subjectId: 's1', isDeleted: true });
  });
});
