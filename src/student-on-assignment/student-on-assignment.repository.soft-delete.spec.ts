import { StudentOnAssignmentRepository } from './student-on-assignment.repository';
import { createPassthroughCache } from '../cache/testing/cache-test-utils';

describe('StudentOnAssignmentRepository.getByStudentId', () => {
  it('leaves out submissions of soft-deleted assignments', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repo = new StudentOnAssignmentRepository(
      { studentOnAssignment: { findMany } } as never,
      createPassthroughCache(),
    );

    await repo.getByStudentId({ studentId: 'st1' });

    expect(findMany).toHaveBeenCalledWith({
      where: { studentId: 'st1', assignment: { is: { isDeleted: false } } },
    });
  });
});
