import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { RawAnalyticsData } from './analytics.repository';

// MemberOnSchoolService transitively imports web-push / google libs that fail
// to load under the test runtime; mock them as the existing project specs do.
jest.mock('web-push', () => ({}));
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(),
  ThinkingLevel: {},
  HarmCategory: {},
  HarmBlockThreshold: {},
}));
jest.mock('googleapis', () => ({}));

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const emptyRaw: RawAnalyticsData = {
    subjects: [{ id: 'sub1', title: 'Math' }],
    subjectIds: ['sub1'],
    enrollments: [
      {
        studentId: 'stu1',
        classId: 'cls1',
        subjectId: 'sub1',
        firstName: 'A',
        lastName: 'B',
        number: '1',
        photo: 'p',
        title: 'Mr',
      },
    ],
    classes: [{ id: 'cls1', title: 'P5/1', level: 'P5' }],
    studentOnAssignments: [
      {
        studentId: 'stu1',
        subjectId: 'sub1',
        status: 'PENDDING',
        isAssigned: true,
        score: null,
        completedAt: null,
        assignmentStatus: 'Published',
        assignmentDueDate: new Date('2020-01-01'),
        assignmentMaxScore: 10,
      },
    ],
    attendances: [
      { studentId: 'stu1', subjectId: 'sub1', status: 'absent', attendanceTableId: 't1' },
    ],
    attendanceStatusValues: [
      { attendanceTableId: 't1', title: 'absent', value: -1 },
    ],
    teacherOnSubjects: [],
  };

  const mockRepo = {
    getCached: jest.fn(),
    setCached: jest.fn(),
    gatherRaw: jest.fn(),
    cacheKey: jest.fn(),
  };
  const mockMember = { validateAccess: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsRepository, useValue: mockRepo },
        { provide: MemberOnSchoolService, useValue: mockMember },
      ],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('compute(): builds a payload and flags the at-risk student', async () => {
    mockRepo.gatherRaw.mockResolvedValue(emptyRaw);
    const result = await service.compute('school1', '1/2567', 'on-demand');

    expect(result.schoolId).toBe('school1');
    expect(result.source).toBe('on-demand');
    expect(result.summary.totalStudents).toBe(1);
    // student has 1 overdue unsubmitted of 1 (missing=100) + absent 1/1 (attend=100)
    // no graded work -> low signal absent -> score is high -> at risk
    expect(result.atRiskStudents.length).toBe(1);
    expect(result.atRiskStudents[0].studentId).toBe('stu1');
    expect(result.atRiskStudents[0].limitedData).toBe(true);
  });

  it('getAnalytics(): returns cached payload on hit without recomputing', async () => {
    mockMember.validateAccess.mockResolvedValue({ role: 'TEACHER' });
    const cached = { schoolId: 'school1', source: 'scheduled' } as any;
    mockRepo.getCached.mockResolvedValue(cached);

    const result = await service.getAnalytics(
      { id: 'u1' } as any,
      'school1',
      '1/2567',
    );

    expect(result).toBe(cached);
    expect(mockRepo.gatherRaw).not.toHaveBeenCalled();
  });

  it('getAnalytics(): computes + caches on miss', async () => {
    mockMember.validateAccess.mockResolvedValue({ role: 'TEACHER' });
    mockRepo.getCached.mockResolvedValue(null);
    mockRepo.gatherRaw.mockResolvedValue(emptyRaw);

    const result = await service.getAnalytics(
      { id: 'u1' } as any,
      'school1',
      '1/2567',
    );

    expect(result.source).toBe('on-demand');
    expect(mockRepo.setCached).toHaveBeenCalledTimes(1);
  });

  it('onTimeSubmissionRate: excludes not-yet-due unsubmitted work from the denominator', async () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const past = new Date('2020-01-01');
    const raw: RawAnalyticsData = {
      subjects: [{ id: 'sub1', title: 'Math' }],
      subjectIds: ['sub1'],
      enrollments: [
        {
          studentId: 'stu1',
          classId: 'cls1',
          subjectId: 'sub1',
          firstName: 'A',
          lastName: 'B',
          number: '1',
          photo: 'p',
          title: 'Mr',
        },
      ],
      classes: [{ id: 'cls1', title: 'P5/1', level: 'P5' }],
      studentOnAssignments: [
        // submitted on time (completed before due) -> counts as eligible + met
        {
          studentId: 'stu1',
          subjectId: 'sub1',
          status: 'REVIEWD',
          isAssigned: true,
          score: 8,
          completedAt: new Date('2019-12-30'),
          assignmentStatus: 'Published',
          assignmentDueDate: past,
          assignmentMaxScore: 10,
        },
        // published but NOT yet due, unsubmitted -> excluded from denominator
        {
          studentId: 'stu1',
          subjectId: 'sub1',
          status: 'PENDDING',
          isAssigned: true,
          score: null,
          completedAt: null,
          assignmentStatus: 'Published',
          assignmentDueDate: future,
          assignmentMaxScore: 10,
        },
      ],
      attendances: [],
      attendanceStatusValues: [],
      teacherOnSubjects: [],
    };
    mockRepo.gatherRaw.mockResolvedValue(raw);

    const result = await service.compute('school1', '1/2567', 'on-demand');

    // 1 on-time of 1 eligible (the not-yet-due item is excluded) -> 1.0
    expect(result.summary.onTimeSubmissionRate).toBe(1);
  });

  it('compute(): builds subject and teacher leaderboards', async () => {
    const raw: RawAnalyticsData = {
      subjects: [{ id: 'sub1', title: 'Math' }],
      subjectIds: ['sub1'],
      enrollments: [
        { studentId: 'stu1', classId: 'cls1', subjectId: 'sub1', firstName: 'A', lastName: 'B', number: '1', photo: 'p', title: 'Mr' },
      ],
      classes: [{ id: 'cls1', title: 'P5/1', level: 'P5' }],
      studentOnAssignments: [],
      attendances: [
        { studentId: 'stu1', subjectId: 'sub1', status: 'present', attendanceTableId: 't1' },
        { studentId: 'stu1', subjectId: 'sub1', status: 'absent', attendanceTableId: 't1' },
      ],
      attendanceStatusValues: [
        { attendanceTableId: 't1', title: 'present', value: 1 },
        { attendanceTableId: 't1', title: 'absent', value: -1 },
      ],
      teacherOnSubjects: [
        { userId: 'u1', subjectId: 'sub1', firstName: 'T', lastName: 'One', photo: 'tp' },
      ],
    };
    mockRepo.gatherRaw.mockResolvedValue(raw);
    const result = await service.compute('school1', '1/2567', 'on-demand');

    expect(result.subjectLeaderboard.length).toBe(1);
    expect(result.subjectLeaderboard[0].subjectId).toBe('sub1');
    expect(result.subjectLeaderboard[0].attendanceRate).toBeCloseTo(0.5);
    expect(result.subjectLeaderboard[0].teachers[0].userId).toBe('u1');
    expect(result.teacherLeaderboard.length).toBe(1);
    expect(result.teacherLeaderboard[0].userId).toBe('u1');
    expect(result.teacherLeaderboard[0].atRiskRate).toBeGreaterThanOrEqual(0);
  });
});
