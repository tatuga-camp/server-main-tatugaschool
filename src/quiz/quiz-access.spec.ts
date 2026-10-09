import { NotFoundException } from '@nestjs/common';
import { QuizAccess } from './quiz-access';

describe('QuizAccess soft-deleted quizzes', () => {
  const student = { id: 'st1' } as any;
  const user = { id: 'u1' } as any;

  function setup() {
    const prisma: any = {
      assignment: { findUnique: jest.fn() },
      studentOnAssignment: { findUnique: jest.fn() },
    };
    const teacher: any = { ValidateAccess: jest.fn().mockResolvedValue({}) };
    return { prisma, teacher, access: new QuizAccess(prisma, teacher) };
  }

  it('teacherAssignment only loads live assignments and 404s otherwise', async () => {
    const { prisma, teacher, access } = setup();
    prisma.assignment.findUnique.mockResolvedValue(null);
    await expect(access.teacherAssignment('a1', user)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.assignment.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1', isDeleted: false },
    });
    expect(teacher.ValidateAccess).not.toHaveBeenCalled();
  });

  it('studentQuiz 404s when the parent quiz was soft-deleted', async () => {
    const { prisma, access } = setup();
    prisma.studentOnAssignment.findUnique.mockResolvedValue({
      id: 'soa1',
      studentId: 'st1',
      isAssigned: true,
      assignment: {
        id: 'a1',
        type: 'Quiz',
        status: 'Published',
        beginDate: new Date(0),
        isDeleted: true,
      },
    });
    await expect(access.studentQuiz('soa1', student)).rejects.toThrow(
      new NotFoundException('Student work not found'),
    );
  });

  it('studentQuiz still returns a live quiz', async () => {
    const { prisma, access } = setup();
    prisma.studentOnAssignment.findUnique.mockResolvedValue({
      id: 'soa1',
      studentId: 'st1',
      isAssigned: true,
      assignment: {
        id: 'a1',
        type: 'Quiz',
        status: 'Published',
        beginDate: new Date(0),
        isDeleted: false,
      },
    });
    const result = await access.studentQuiz('soa1', student);
    expect(result.assignment.id).toBe('a1');
    expect(result.soa.id).toBe('soa1');
  });
});
