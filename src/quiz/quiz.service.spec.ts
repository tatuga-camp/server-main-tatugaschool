import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { TeacherOnSubjectService } from '../teacher-on-subject/teacher-on-subject.service';
import { QuizAccess } from './quiz-access';
import { QuizService } from './quiz.service';

const user = { id: 'u1' } as any;
const assignment = {
  id: 'a1',
  type: 'Quiz',
  subjectId: 's1',
  schoolId: 'sc1',
  title: 'Quiz 1',
  quizSettings: null,
  maxScore: 0,
} as any;
const singleDto = {
  assignmentId: 'a1',
  type: 'SINGLE',
  prompt: 'Q?',
  points: 2,
  options: [
    { id: 'a', text: 'A', isCorrect: true },
    { id: 'b', text: 'B', isCorrect: false },
  ],
  blanks: [],
} as any;

describe('QuizService', () => {
  let service: QuizService;
  const prisma = {
    subject: { findUnique: jest.fn() },
    assignment: { update: jest.fn(), create: jest.fn() },
    assignmentOnQuiz: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    studentOnAssignment: { count: jest.fn(), createMany: jest.fn() },
    studentOnSubject: { findMany: jest.fn() },
  };
  const access = { teacherAssignment: jest.fn() };
  const cache = { bump: jest.fn() };
  const teacherOnSubject = { ValidateAccess: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    access.teacherAssignment.mockResolvedValue(assignment);
    prisma.subject.findUnique.mockResolvedValue({
      id: 's1',
      schoolId: 'sc1',
      isLocked: false,
    });
    prisma.studentOnAssignment.count.mockResolvedValue(0);
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([
      { points: 2 },
      { points: 3 },
    ]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: PrismaService, useValue: prisma },
        { provide: QuizAccess, useValue: access },
        { provide: CacheService, useValue: cache },
        { provide: TeacherOnSubjectService, useValue: teacherOnSubject },
      ],
    }).compile();
    service = moduleRef.get(QuizService);
  });

  it('creates a question at the next order and re-syncs maxScore', async () => {
    prisma.assignmentOnQuiz.findFirst.mockResolvedValue({ order: 4 });
    prisma.assignmentOnQuiz.create.mockResolvedValue({ id: 'q1' });
    await service.createQuestion(singleDto, user);
    expect(prisma.assignmentOnQuiz.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        order: 5,
        type: 'SINGLE',
        points: 2,
        options: [
          { id: 'a', text: 'A', imageUrl: null, isCorrect: true },
          { id: 'b', text: 'B', imageUrl: null, isCorrect: false },
        ],
        blanks: [],
        assignmentId: 'a1',
        subjectId: 's1',
        schoolId: 'sc1',
      }),
    });
    expect(prisma.assignment.update).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { maxScore: 5 },
    });
    expect(cache.bump).toHaveBeenCalledWith(
      'subject:s1:assignments',
      'subject:s1:grades',
    );
  });

  it('rejects an invalid shape with 400', async () => {
    await expect(
      service.createQuestion(
        { ...singleDto, options: [{ id: 'a', text: 'A', isCorrect: true }] },
        user,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('locks editing once any attempt exists (409 QUIZ_LOCKED)', async () => {
    prisma.studentOnAssignment.count.mockResolvedValue(1);
    await expect(service.createQuestion(singleDto, user)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.studentOnAssignment.count).toHaveBeenCalledWith({
      where: { assignmentId: 'a1', quizAttempt: { isSet: true } },
    });
  });

  it('locks update, delete and reorder once any attempt exists (409 QUIZ_LOCKED)', async () => {
    prisma.studentOnAssignment.count.mockResolvedValue(1);
    prisma.assignmentOnQuiz.findUnique.mockResolvedValue({
      id: 'q1',
      assignmentId: 'a1',
      type: 'SINGLE',
      prompt: 'Q',
      options: singleDto.options,
      blanks: [],
    });
    await expect(
      service.updateQuestion('q1', { prompt: 'New?' } as any, user),
    ).rejects.toThrow('QUIZ_LOCKED');
    await expect(service.deleteQuestion('q1', user)).rejects.toThrow(
      ConflictException,
    );
    await expect(service.reorder('a1', { ids: ['q1'] }, user)).rejects.toThrow(
      'QUIZ_LOCKED',
    );
    await expect(service.reorder('a1', { ids: ['q1'] }, user)).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.assignmentOnQuiz.update).not.toHaveBeenCalled();
    expect(prisma.assignmentOnQuiz.delete).not.toHaveBeenCalled();
  });

  it('validates the merged shape on update', async () => {
    prisma.assignmentOnQuiz.findUnique.mockResolvedValue({
      id: 'q1',
      assignmentId: 'a1',
      type: 'SINGLE',
      prompt: 'Q',
      options: singleDto.options,
      blanks: [],
    });
    await expect(
      service.updateQuestion(
        'q1',
        {
          options: [
            { id: 'a', text: 'A', isCorrect: false },
            { id: 'b', text: 'B', isCorrect: false },
          ],
        } as any,
        user,
      ),
    ).rejects.toThrow(/exactly one correct/);
  });

  it('reorder requires every question exactly once', async () => {
    prisma.assignmentOnQuiz.findMany.mockResolvedValueOnce([
      { id: 'q1' },
      { id: 'q2' },
    ]);
    await expect(service.reorder('a1', { ids: ['q1'] }, user)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('duplicates into another subject with questions and student rows', async () => {
    prisma.assignmentOnQuiz.findMany.mockReset();
    prisma.assignmentOnQuiz.findMany.mockResolvedValue([
      {
        order: 0,
        type: 'SINGLE',
        prompt: 'Q',
        imageUrl: null,
        points: 2,
        options: singleDto.options,
        blanks: [],
      },
    ]);
    prisma.subject.findUnique.mockResolvedValue({
      id: 's2',
      schoolId: 'sc1',
      isLocked: false,
    });
    prisma.assignment.create.mockResolvedValue({ id: 'a2' });
    prisma.studentOnSubject.findMany.mockResolvedValue([
      {
        id: 'sos1',
        title: 'Mr',
        firstName: 'A',
        lastName: 'B',
        number: '1',
        blurHash: null,
        photo: 'p',
        schoolId: 'sc1',
        studentId: 'st1',
        subjectId: 's2',
      },
    ]);
    const copy = await service.duplicate('a1', { targetSubjectId: 's2' }, user);
    expect(copy).toEqual({ id: 'a2' });
    expect(teacherOnSubject.ValidateAccess).toHaveBeenCalledWith({
      userId: 'u1',
      subjectId: 's2',
    });
    expect(prisma.assignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'Quiz',
        status: 'Draft',
        subjectId: 's2',
        title: 'Quiz 1',
      }),
    });
    expect(prisma.assignmentOnQuiz.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          assignmentId: 'a2',
          subjectId: 's2',
          prompt: 'Q',
        }),
      ],
    });
    expect(prisma.studentOnAssignment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          assignmentId: 'a2',
          studentOnSubjectId: 'sos1',
          isAssigned: true,
        }),
      ],
    });
  });
});
