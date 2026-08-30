import { Test, TestingModule } from '@nestjs/testing';
import {
  COLLECTION_CONFIG,
  SubjectQueryToolService,
} from './subject-query-tool';
import { PrismaReadService } from '../prisma/prisma-read.service';

const makeDelegate = () => ({
  findMany: jest.fn().mockResolvedValue([]),
  findUnique: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  groupBy: jest.fn().mockResolvedValue([]),
});

describe('SubjectQueryToolService', () => {
  let service: SubjectQueryToolService;
  let prismaRead: Record<string, ReturnType<typeof makeDelegate>>;

  const SUBJECT_ID = '69f1cd5b33e82772fc4a85f5';

  beforeEach(async () => {
    prismaRead = {};
    const delegates = [
      ...Object.values(COLLECTION_CONFIG).map((c) => c.model),
      'subject',
      'studentOnSubject',
      'assignment',
      'attendanceTable',
      'attendanceRow',
      'attendanceStatusList',
      'gradeRange',
      'scoreOnSubject',
      'teacherOnSubject',
      'groupOnSubject',
      'unitOnGroup',
      'studentOnGroup',
      'rubric',
    ];
    for (const name of delegates) prismaRead[name] = makeDelegate();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubjectQueryToolService,
        { provide: PrismaReadService, useValue: prismaRead },
      ],
    }).compile();

    service = module.get(SubjectQueryToolService);
  });

  describe('validation', () => {
    it('rejects an unknown collection with the allowed list', async () => {
      const result = await service.execute(SUBJECT_ID, { collection: 'users' });
      expect(result.error).toContain('Unknown collection');
      expect(result.error).toContain('attendances');
    });

    it('rejects a filter field outside the whitelist', async () => {
      const result = await service.execute(SUBJECT_ID, {
        collection: 'attendances',
        filters: { note: 'x' },
      });
      expect(result.error).toContain('"note" is not allowed');
      expect(prismaRead.attendance.findMany).not.toHaveBeenCalled();
    });

    it('rejects a model-supplied subjectId', async () => {
      const result = await service.execute(SUBJECT_ID, {
        collection: 'attendances',
        filters: { subjectId: 'other-subject' },
      });
      expect(result.error).toContain('set by the server');
      expect(prismaRead.attendance.findMany).not.toHaveBeenCalled();
    });

    it('rejects an invalid date filter', async () => {
      const result = await service.execute(SUBJECT_ID, {
        collection: 'attendances',
        filters: { dateFrom: 'yesterday-ish' },
      });
      expect(result.error).toContain('ISO 8601');
    });

    it('rejects groupBy fields outside the whitelist', async () => {
      const result = await service.execute(SUBJECT_ID, {
        collection: 'attendances',
        mode: 'groupBy',
        groupBy: 'note',
      });
      expect(result.error).toContain('not allowed');
      expect(prismaRead.attendance.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('rows mode', () => {
    it('injects subjectId, applies projection/limit/order', async () => {
      await service.execute(SUBJECT_ID, {
        collection: 'attendances',
        filters: { studentOnSubjectId: 'sos1', status: 'ABSENT' },
      });

      expect(prismaRead.attendance.findMany).toHaveBeenCalledWith({
        where: { subjectId: SUBJECT_ID, studentOnSubjectId: 'sos1', status: 'ABSENT' },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          status: true,
          note: true,
          studentOnSubjectId: true,
          attendanceRowId: true,
        },
        take: 100,
        orderBy: { startDate: 'desc' },
      });
    });

    it('clamps limit to 200', async () => {
      await service.execute(SUBJECT_ID, { collection: 'attendances', limit: 5000 });
      const call = prismaRead.attendance.findMany.mock.calls[0][0];
      expect(call.take).toBe(200);
    });

    it('translates dateFrom/dateTo into a range on the date field', async () => {
      await service.execute(SUBJECT_ID, {
        collection: 'attendances',
        filters: { dateFrom: '2026-08-01', dateTo: '2026-08-31' },
      });
      const call = prismaRead.attendance.findMany.mock.calls[0][0];
      expect(call.where.startDate).toEqual({
        gte: new Date('2026-08-01'),
        lte: new Date('2026-08-31'),
      });
    });

    it('returns an error instead of an oversized result', async () => {
      prismaRead.scoreOnStudent.findMany.mockResolvedValue(
        Array.from({ length: 200 }, () => ({ title: 'x'.repeat(400) })),
      );
      const result = await service.execute(SUBJECT_ID, {
        collection: 'scoreOnStudents',
      });
      expect(result.error).toContain('too large');
    });
  });

  describe('count and groupBy modes', () => {
    it('count runs count with the scoped where', async () => {
      prismaRead.attendance.count.mockResolvedValue(42);
      const result = await service.execute(SUBJECT_ID, {
        collection: 'attendances',
        mode: 'count',
        filters: { status: 'LATE' },
      });
      expect(prismaRead.attendance.count).toHaveBeenCalledWith({
        where: { subjectId: SUBJECT_ID, status: 'LATE' },
      });
      expect(result.count).toBe(42);
    });

    it('groupBy adds _count and the configured _sum', async () => {
      await service.execute(SUBJECT_ID, {
        collection: 'scoreOnStudents',
        mode: 'groupBy',
        groupBy: 'studentOnSubjectId',
      });
      expect(prismaRead.scoreOnStudent.groupBy).toHaveBeenCalledWith({
        by: ['studentOnSubjectId'],
        where: { subjectId: SUBJECT_ID },
        _count: { _all: true },
        _sum: { score: true },
      });
    });
  });

  describe('COLLSCAN policy invariants (config-level)', () => {
    it('whitelists contain no known-optional fields', () => {
      // Optional fields on these models per schema.prisma — filtering them
      // makes Prisma emit non-indexable $expr on MongoDB.
      const optionalFields = [
        'note', 'score', 'body', 'completedAt', 'reviewdAt', 'comment',
        'description', 'blurHash', 'photo', 'maxScore', 'weight',
      ];
      for (const [name, config] of Object.entries(COLLECTION_CONFIG)) {
        for (const field of [...config.filters, ...config.groupBy]) {
          expect({ collection: name, field, optional: optionalFields.includes(field) })
            .toEqual({ collection: name, field, optional: false });
        }
      }
    });

    it('projections never include token bombs', () => {
      for (const config of Object.values(COLLECTION_CONFIG)) {
        expect(config.select).not.toContain('photo');
        expect(config.select).not.toContain('blurHash');
        expect(config.select).not.toContain('vector');
        expect(config.select).not.toContain('body');
        expect(config.select).not.toContain('schoolId');
      }
    });
  });

  describe('functionDeclarations', () => {
    it('declares the student-summary tool and the query tool with every collection', () => {
      const decls = service.functionDeclarations;
      expect(decls.map((d) => d.name)).toEqual([
        'get_student_summary',
        'query_subject_data',
      ]);
      const queryDecl: any = decls.find((d) => d.name === 'query_subject_data');
      expect(queryDecl.parametersJsonSchema.properties.collection.enum).toEqual(
        Object.keys(COLLECTION_CONFIG),
      );
    });
  });

  describe('handleCall', () => {
    it('routes to the right handler and rejects unknown tools', async () => {
      const unknown = await service.handleCall(SUBJECT_ID, 'drop_tables', {});
      expect(unknown.error).toContain('Unknown tool');

      await service.handleCall(SUBJECT_ID, 'query_subject_data', {
        collection: 'attendances',
      });
      expect(prismaRead.attendance.findMany).toHaveBeenCalled();
    });
  });

  describe('getStudentSummary', () => {
    it('rejects a studentOnSubjectId that is not in this subject', async () => {
      prismaRead.studentOnSubject.findFirst = jest.fn().mockResolvedValue(null);
      const result = await service.getStudentSummary(SUBJECT_ID, 'sos-other');
      expect(result.error).toContain('No student');
      expect(prismaRead.studentOnSubject.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'sos-other', subjectId: SUBJECT_ID } }),
      );
      expect(prismaRead.attendance.groupBy).not.toHaveBeenCalled();
    });

    it('requires a studentOnSubjectId', async () => {
      const result = await service.getStudentSummary(SUBJECT_ID, undefined);
      expect(result.error).toContain('required');
    });

    it('fetches the full picture with subject-scoped, in-filtered queries', async () => {
      prismaRead.studentOnSubject.findFirst = jest.fn().mockResolvedValue({
        id: 'sos1',
        firstName: 'กรวิภา',
        totalSpeicalScore: 3,
      });
      prismaRead.scoreOnStudent.findMany.mockResolvedValue([
        { title: 'ตั้งใจเรียน', score: 2 },
        { title: 'ช่วยเพื่อน', score: 1 },
      ]);
      prismaRead.scoreOnStudent.groupBy.mockResolvedValue([
        { title: 'ตั้งใจเรียน', _count: { _all: 1 }, _sum: { score: 2 } },
        { title: 'ช่วยเพื่อน', _count: { _all: 1 }, _sum: { score: 1 } },
      ]);
      prismaRead.studentOnAssignment.findMany.mockResolvedValue([
        { id: 'soa1', assignmentId: 'a1', status: 'REVIEWD', score: 8 },
        { id: 'soa2', assignmentId: 'a2', status: 'PENDDING', score: null },
      ]);
      prismaRead.rubricScoreOnStudentAssignment.findMany.mockResolvedValue([
        {
          points: 4,
          comment: 'เยี่ยมมาก',
          criterionId: 'c1',
          selectedLevelId: 'l1',
          studentOnAssignmentId: 'soa1',
        },
      ]);
      prismaRead.rubric.findMany.mockResolvedValue([
        {
          criteria: [
            {
              id: 'c1',
              title: 'ความถูกต้อง',
              levels: [{ id: 'l1', title: 'ดีเยี่ยม', points: 4 }],
            },
          ],
        },
      ]);

      const result: any = await service.getStudentSummary(SUBJECT_ID, 'sos1');

      const scoped = { subjectId: SUBJECT_ID, studentOnSubjectId: 'sos1' };
      expect(prismaRead.attendance.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ by: ['status'], where: scoped }),
      );
      expect(prismaRead.attendance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: scoped }),
      );
      expect(prismaRead.scoreOnStudent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: scoped }),
      );
      // per-title behavior-score breakdown is computed DB-side
      expect(prismaRead.scoreOnStudent.groupBy).toHaveBeenCalledWith({
        by: ['title'],
        where: scoped,
        _count: { _all: true },
        _sum: { score: true },
      });
      // comments and rubric scores are matched through the student's own
      // studentOnAssignment ids (required + indexed field, in-filter)
      expect(prismaRead.commentOnAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            subjectId: SUBJECT_ID,
            studentOnAssignmentId: { in: ['soa1', 'soa2'] },
          },
        }),
      );
      expect(prismaRead.rubricScoreOnStudentAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            subjectId: SUBJECT_ID,
            studentOnAssignmentId: { in: ['soa1', 'soa2'] },
          },
        }),
      );
      expect(result.behaviorScoreTotal).toBe(3);
      expect(result.behaviorScoreByTitle).toEqual([
        { title: 'ตั้งใจเรียน', _count: { _all: 1 }, _sum: { score: 2 } },
        { title: 'ช่วยเพื่อน', _count: { _all: 1 }, _sum: { score: 1 } },
      ]);
      expect(result.assignments).toHaveLength(2);
      // rubric scores come back with resolved criterion/level titles
      expect(result.rubricScores).toEqual([
        expect.objectContaining({
          points: 4,
          comment: 'เยี่ยมมาก',
          criterionTitle: 'ความถูกต้อง',
          levelTitle: 'ดีเยี่ยม',
        }),
      ]);
      expect(prismaRead.rubric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { subjectId: SUBJECT_ID } }),
      );
    });

    it('skips comment/rubric queries when the student has no assignments', async () => {
      prismaRead.studentOnSubject.findFirst = jest.fn().mockResolvedValue({ id: 'sos1' });
      const result: any = await service.getStudentSummary(SUBJECT_ID, 'sos1');
      expect(prismaRead.commentOnAssignment.findMany).not.toHaveBeenCalled();
      expect(result.teacherComments).toEqual([]);
    });
  });

  describe('getPreamble', () => {
    it('fetches only small collections, all scoped to the subject', async () => {
      prismaRead.subject.findUnique.mockResolvedValue({ id: 's1', title: 'Math' });
      prismaRead.assignment.findMany.mockResolvedValue([
        { id: 'a1', title: 'HW', description: 'd'.repeat(500) },
      ]);
      prismaRead.studentOnSubject.findMany.mockResolvedValue([
        { id: 'sos1', firstName: 'กรวิภา' },
      ]);

      const preamble = await service.getPreamble(SUBJECT_ID);

      expect(prismaRead.studentOnSubject.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subjectId: SUBJECT_ID, isActive: true },
        }),
      );
      expect(prismaRead.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { subjectId: SUBJECT_ID, status: 'Published' },
        }),
      );
      // the four row-dump collections must NOT be part of the preamble
      expect(prismaRead.attendance.findMany).not.toHaveBeenCalled();
      expect(prismaRead.scoreOnStudent.findMany).not.toHaveBeenCalled();
      expect(prismaRead.studentOnAssignment.findMany).not.toHaveBeenCalled();
      expect(prismaRead.rubricScoreOnStudentAssignment.findMany).not.toHaveBeenCalled();
      // long assignment descriptions are truncated
      expect(preamble.assignments[0].description).toHaveLength(200);
      // roster ids are exposed under their real filter name so the model
      // never passes them as the account-level studentId
      expect(preamble.students[0]).toEqual({
        studentOnSubjectId: 'sos1',
        firstName: 'กรวิภา',
      });
    });
  });
});
