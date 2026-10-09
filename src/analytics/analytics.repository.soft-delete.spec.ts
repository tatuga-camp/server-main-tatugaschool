import { AnalyticsRepository } from './analytics.repository';

// Work on a soft-deleted assignment must not count towards school analytics.
describe('AnalyticsRepository hides soft-deleted assignments', () => {
  const delegate = () => ({ findMany: jest.fn().mockResolvedValue([]) });
  let prismaRead: Record<string, ReturnType<typeof delegate>>;
  let repo: AnalyticsRepository;

  beforeEach(() => {
    prismaRead = {
      subject: delegate(),
      studentOnSubject: delegate(),
      studentOnAssignment: delegate(),
      attendance: delegate(),
      attendanceStatusList: delegate(),
      teacherOnSubject: delegate(),
      class: delegate(),
    };
    prismaRead.subject.findMany.mockResolvedValue([{ id: 's1', title: 'M' }]);
    repo = new AnalyticsRepository(prismaRead as never, {} as never);
  });

  it('gatherRaw reads only submissions of live assignments', async () => {
    await repo.gatherRaw('sch1', '1/2026');
    expect(
      prismaRead.studentOnAssignment.findMany.mock.calls[0][0].where,
    ).toEqual({
      schoolId: 'sch1',
      subjectId: { in: ['s1'] },
      assignment: { is: { isDeleted: false } },
    });
  });

  it('getStudentMissingAssignments leaves out deleted assignments', async () => {
    await repo.getStudentMissingAssignments('sch1', 'st1', '1/2026');
    expect(
      prismaRead.studentOnAssignment.findMany.mock.calls[0][0].where.assignment,
    ).toEqual({ is: { status: 'Published', isDeleted: false } });
  });
});
