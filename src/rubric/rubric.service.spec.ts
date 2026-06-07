import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

// RubricService transitively imports AiService, which loads @google/genai at
// module level (pulls in google-auth-library -> buffer-equal-constant-time and
// crashes under newer Node). These tests inject a fake `ai` collaborator, so the
// real AiService is never used — stub the module to keep the import chain light.
jest.mock('../ai/ai.service', () => ({ AiService: class AiService {} }));

import { RubricService } from './rubric.service';

const subject = { id: 'sub1', schoolId: 'school1' };

function makeService() {
  const prisma: any = {
    subject: { findUnique: jest.fn().mockResolvedValue(subject) },
  };
  const teacher: any = { ValidateAccess: jest.fn().mockResolvedValue(true) };
  const ai: any = { generateContent: jest.fn(), summarizeFile: jest.fn() };
  const service = new RubricService(prisma, teacher, ai);
  (service as any).repo = {
    createFull: jest.fn().mockResolvedValue({ id: 'r1' }),
    findManyBySubject: jest.fn().mockResolvedValue([]),
    findByIdWithTree: jest.fn(),
    countAssignmentsUsing: jest.fn().mockResolvedValue(0),
    deleteCascade: jest.fn().mockResolvedValue(undefined),
    replaceCriteria: jest.fn().mockResolvedValue({ id: 'r1' }),
  };
  return { service, prisma, teacher };
}

describe('RubricService CRUD', () => {
  it('creates a rubric after validating teacher access', async () => {
    const { service, teacher } = makeService();
    const user: any = { id: 'u1' };
    const result = await service.create(
      {
        title: 'R',
        subjectId: 'sub1',
        criteria: [
          {
            title: 'C1',
            weight: 1,
            order: 0,
            levels: [
              { title: 'Good', points: 2, order: 0 },
              { title: 'Bad', points: 1, order: 1 },
            ],
          },
        ],
      } as any,
      user,
    );
    expect(teacher.ValidateAccess).toHaveBeenCalledWith({
      userId: 'u1',
      subjectId: 'sub1',
    });
    expect(result).toEqual({ id: 'r1' });
  });

  it('throws NotFoundException on create when the subject does not exist', async () => {
    const { service, prisma } = makeService();
    prisma.subject.findUnique.mockResolvedValue(null);
    await expect(
      service.create(
        { title: 'R', subjectId: 'missing', criteria: [] } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a rubric via deleteCascade when it is unused', async () => {
    const { service } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue({
      id: 'r1',
      subjectId: 'sub1',
    });
    (service as any).repo.countAssignmentsUsing.mockResolvedValue(0);
    const result = await service.delete(
      { rubricId: 'r1' } as any,
      { id: 'u1' } as any,
    );
    expect((service as any).repo.deleteCascade).toHaveBeenCalledWith('r1');
    expect(result).toEqual({ id: 'r1' });
  });

  it('blocks delete when the rubric is attached to an assignment', async () => {
    const { service } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue({
      id: 'r1',
      subjectId: 'sub1',
    });
    (service as any).repo.countAssignmentsUsing.mockResolvedValue(2);
    await expect(
      service.delete({ rubricId: 'r1' } as any, { id: 'u1' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects create when the caller is not a co-teacher or admin', async () => {
    const { service, teacher } = makeService();
    teacher.ValidateAccess.mockRejectedValue(
      new ForbiddenException("You're not a teacher on this subject"),
    );
    await expect(
      service.create(
        { title: 'R', subjectId: 'sub1', criteria: [] } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect((service as any).repo.createFull).not.toHaveBeenCalled();
  });

  it('updates a rubric after validating teacher access', async () => {
    const { service, teacher } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue({
      id: 'r1',
      subjectId: 'sub1',
    });
    const result = await service.update(
      {
        rubricId: 'r1',
        title: 'R2',
        criteria: [
          {
            title: 'C1',
            weight: 1,
            order: 0,
            levels: [
              { title: 'Good', points: 2, order: 0 },
              { title: 'Bad', points: 1, order: 1 },
            ],
          },
        ],
      } as any,
      { id: 'u1' } as any,
    );
    expect(teacher.ValidateAccess).toHaveBeenCalledWith({
      userId: 'u1',
      subjectId: 'sub1',
    });
    expect((service as any).repo.replaceCriteria).toHaveBeenCalled();
    expect(result).toEqual({ id: 'r1' });
  });

  it('throws NotFoundException on update when the rubric does not exist', async () => {
    const { service } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue(null);
    await expect(
      service.update(
        { rubricId: 'missing', title: 'R', criteria: [] } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects update when the caller is not a co-teacher or admin', async () => {
    const { service, teacher } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue({
      id: 'r1',
      subjectId: 'sub1',
    });
    teacher.ValidateAccess.mockRejectedValue(
      new ForbiddenException("You're not a teacher on this subject"),
    );
    await expect(
      service.update(
        { rubricId: 'r1', title: 'R', criteria: [] } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect((service as any).repo.replaceCriteria).not.toHaveBeenCalled();
  });

  it('rejects delete when the caller is not a co-teacher or admin', async () => {
    const { service, teacher } = makeService();
    (service as any).repo.findByIdWithTree.mockResolvedValue({
      id: 'r1',
      subjectId: 'sub1',
    });
    teacher.ValidateAccess.mockRejectedValue(
      new ForbiddenException("You're not a teacher on this subject"),
    );
    await expect(
      service.delete({ rubricId: 'r1' } as any, { id: 'u1' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect((service as any).repo.deleteCascade).not.toHaveBeenCalled();
  });
});

describe('RubricService.gradeStudent', () => {
  function gradingService() {
    const prisma: any = {
      subject: { findUnique: jest.fn().mockResolvedValue(subject) },
      $transaction: jest.fn(async (fn: any) => fn(prisma)),
      rubricScoreOnStudentAssignment: {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      studentOnAssignment: { update: jest.fn().mockResolvedValue({ id: 'soa1' }) },
    };
    const teacher: any = { ValidateAccess: jest.fn().mockResolvedValue(true) };
    const ai: any = {};
    const service = new RubricService(prisma, teacher, ai);
    (service as any).repo = {
      getStudentOnAssignment: jest.fn().mockResolvedValue({
        id: 'soa1',
        assignmentId: 'a1',
        subjectId: 'sub1',
        schoolId: 'school1',
      }),
    };
    (service as any).loadAssignmentRubric = jest.fn().mockResolvedValue({
      maxScore: 10,
      criteria: [
        {
          id: 'c1',
          weight: 1,
          levels: [
            { id: 'l-lo', points: 1 },
            { id: 'l-hi', points: 4 },
          ],
        },
      ],
    });
    return { service, prisma, teacher };
  }

  it('rejects an item whose criterion is not in the assignment rubric', async () => {
    const { service } = gradingService();
    await expect(
      service.gradeStudent(
        {
          studentOnAssignmentId: 'soa1',
          items: [{ criterionId: 'XXX', selectedLevelId: 'l-hi' }],
        } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate criterionId in items', async () => {
    const { service } = gradingService();
    await expect(
      service.gradeStudent(
        {
          studentOnAssignmentId: 'soa1',
          items: [
            { criterionId: 'c1', selectedLevelId: 'l-hi' },
            { criterionId: 'c1', selectedLevelId: 'l-lo' },
          ],
        } as any,
        { id: 'u1' } as any,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes and writes the normalized score with status REVIEWD', async () => {
    const { service, prisma } = gradingService();
    await service.gradeStudent(
      {
        studentOnAssignmentId: 'soa1',
        items: [{ criterionId: 'c1', selectedLevelId: 'l-hi' }],
      } as any,
      { id: 'u1' } as any,
    );
    expect(prisma.studentOnAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ score: 10, status: 'REVIEWD' }),
      }),
    );
  });
});

describe('RubricService.readBreakdownForStudent', () => {
  it('throws Forbidden when the student does not own the assignment', async () => {
    const prisma: any = {};
    const teacher: any = { ValidateAccess: jest.fn() };
    const ai: any = {};
    const service = new RubricService(prisma, teacher, ai);
    (service as any).repo = {
      findBreakdown: jest.fn().mockResolvedValue({
        soa: { id: 'soa1', studentId: 'studentA', subjectId: 'sub1', score: 5, assignment: { id: 'a1', maxScore: 10, rubric: null } },
        scores: [],
      }),
    };
    await expect(
      service.readBreakdownForStudent(
        { studentOnAssignmentId: 'soa1' } as any,
        { id: 'studentB', schoolId: 'school1' } as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns a shaped breakdown for the owning student', async () => {
    const prisma: any = {};
    const teacher: any = {};
    const ai: any = {};
    const service = new RubricService(prisma, teacher, ai);
    (service as any).repo = {
      findBreakdown: jest.fn().mockResolvedValue({
        soa: { id: 'soa1', studentId: 'studentA', subjectId: 'sub1', score: 8, assignment: { id: 'a1', maxScore: 10, rubric: { id: 'r1', title: 'R', criteria: [{ id: 'c1', title: 'C1', description: null, weight: 1, levels: [{ id: 'l1', title: 'Good', description: null, points: 4 }] }] } } },
        scores: [{ criterionId: 'c1', selectedLevelId: 'l1', points: 4, comment: 'nice' }],
      }),
    };
    const result = await service.readBreakdownForStudent(
      { studentOnAssignmentId: 'soa1' } as any,
      { id: 'studentA', schoolId: 'school1' } as any,
    );
    expect(result.finalScore).toBe(8);
    expect(result.rubric.criteria[0].selectedLevelId).toBe('l1');
    expect(result.rubric.criteria[0].comment).toBe('nice');
  });
});

describe('RubricService.aiDraft', () => {
  function aiService(modelText: string) {
    const prisma: any = {
      subject: { findUnique: jest.fn().mockResolvedValue(subject) },
    };
    const teacher: any = { ValidateAccess: jest.fn().mockResolvedValue(true) };
    const ai: any = {
      generateContent: jest.fn().mockResolvedValue(modelText),
      summarizeFile: jest.fn(),
    };
    const service = new RubricService(prisma, teacher, ai);
    return { service, ai };
  }

  const validJson = JSON.stringify({
    title: 'Essay Rubric',
    description: 'd',
    criteria: [
      {
        title: 'Organization',
        weight: 1,
        levels: [
          { title: 'Excellent', points: 4 },
          { title: 'Poor', points: 1 },
        ],
      },
    ],
  });

  it('parses a valid draft and returns it', async () => {
    const { service } = aiService('```json\n' + validJson + '\n```');
    const result = await service.aiDraft(
      { subjectId: 'sub1', topic: 't', gradeLevel: 'G5', learningGoal: 'g' } as any,
      { id: 'u1' } as any,
      'token',
    );
    expect(result.draft.criteria[0].levels.length).toBe(2);
  });

  it('retries once on invalid JSON then throws', async () => {
    const { service, ai } = aiService('not json');
    await expect(
      service.aiDraft(
        { subjectId: 'sub1', topic: 't', gradeLevel: 'G5', learningGoal: 'g' } as any,
        { id: 'u1' } as any,
        'token',
      ),
    ).rejects.toBeTruthy();
    expect(ai.generateContent).toHaveBeenCalledTimes(2);
  });

  it('defaults missing weight to 1 and clamps negative points', async () => {
    const json = JSON.stringify({
      title: 'R',
      criteria: [
        {
          title: 'C1', // no weight
          levels: [
            { title: 'Hi', points: 4 },
            { title: 'Lo', points: -2 },
          ],
        },
      ],
    });
    const { service } = aiService('```json\n' + json + '\n```');
    const result = await service.aiDraft(
      { subjectId: 'sub1', topic: 't', gradeLevel: 'G5', learningGoal: 'g' } as any,
      { id: 'u1' } as any,
      'token',
    );
    expect(result.draft.criteria[0].weight).toBe(1);
    expect(result.draft.criteria[0].levels[1].points).toBe(0);
  });
});
