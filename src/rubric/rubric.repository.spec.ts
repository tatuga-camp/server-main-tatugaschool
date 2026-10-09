import { RubricRepository } from './rubric.repository';

describe('RubricRepository soft-deleted assignments', () => {
  function setup() {
    const prisma: any = {
      assignment: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      studentOnAssignment: { findUnique: jest.fn().mockResolvedValue(null) },
      rubric: { findUnique: jest.fn() },
    };
    return { prisma, repo: new RubricRepository(prisma) };
  }

  it('countAssignmentsUsing ignores deleted assignments, so they never block a rubric delete', async () => {
    const { prisma, repo } = setup();
    await repo.countAssignmentsUsing('r1');
    expect(prisma.assignment.count).toHaveBeenCalledWith({
      where: { rubricId: 'r1', isDeleted: false },
    });
  });

  it('findAssignmentRubric does not load the rubric of a deleted assignment', async () => {
    const { prisma, repo } = setup();
    await expect(repo.findAssignmentRubric('a1')).resolves.toBeNull();
    expect(prisma.assignment.findUnique.mock.calls[0][0].where).toEqual({
      id: 'a1',
      isDeleted: false,
    });
    expect(prisma.rubric.findUnique).not.toHaveBeenCalled();
  });

  it('findBreakdown selects assignment.isDeleted for the 404 check', async () => {
    const { prisma, repo } = setup();
    await repo.findBreakdown('soa1');
    const select =
      prisma.studentOnAssignment.findUnique.mock.calls[0][0].select;
    expect(select.assignment.select.isDeleted).toBe(true);
  });
});
