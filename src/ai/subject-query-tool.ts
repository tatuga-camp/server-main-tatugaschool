import { Injectable, Logger } from '@nestjs/common';
import { PrismaReadService } from '../prisma/prisma-read.service';

/**
 * Constrained query DSL for the LINE-bot AI agent.
 *
 * The model never writes Mongo/Prisma queries — it can only fill this schema,
 * and the executor turns it into Prisma reads on the read replica. Guards are
 * structural, not inspective:
 *  - subjectId is injected server-side; the model cannot supply or override it
 *  - filter/groupBy whitelists contain ONLY fields that are required in
 *    schema.prisma AND indexed — filters on optional fields compile to
 *    non-indexable $expr on Mongo (the 2026-08 notification COLLSCAN trap)
 *  - projections exclude token bombs (photos, blurhash, submission bodies)
 *  - row counts and result sizes are capped
 */

export type QueryMode = 'rows' | 'count' | 'groupBy';

export interface SubjectQueryArgs {
  collection?: string;
  filters?: Record<string, string>;
  mode?: QueryMode;
  groupBy?: string;
  limit?: number;
}

export interface CollectionConfig {
  /** PrismaClient delegate property, e.g. prisma.attendance */
  model: string;
  /** Raw MongoDB collection name (Prisma model name; no @@map in this schema) */
  mongoCollection: string;
  /** Equality-filter whitelist: required + indexed fields only */
  filters: string[];
  /** groupBy whitelist */
  groupBy: string[];
  /** numeric field summed in groupBy mode (in addition to _count) */
  sum?: string;
  /** projection; `id` is always added */
  select: string[];
  /** required DateTime field used for dateFrom/dateTo and orderBy */
  dateField: string;
}

export const COLLECTION_CONFIG: Record<string, CollectionConfig> = {
  attendances: {
    model: 'attendance',
    mongoCollection: 'Attendance',
    filters: [
      'studentOnSubjectId',
      'attendanceRowId',
      'attendanceTableId',
      'studentId',
      'status',
    ],
    groupBy: ['status', 'studentOnSubjectId', 'attendanceRowId'],
    select: [
      'startDate',
      'endDate',
      'status',
      'note',
      'studentOnSubjectId',
      'attendanceRowId',
    ],
    dateField: 'startDate',
  },
  scoreOnStudents: {
    model: 'scoreOnStudent',
    mongoCollection: 'ScoreOnStudent',
    filters: ['studentOnSubjectId', 'scoreOnSubjectId', 'studentId'],
    groupBy: ['studentOnSubjectId', 'scoreOnSubjectId', 'title'],
    sum: 'score',
    select: ['score', 'title', 'createAt', 'studentOnSubjectId', 'scoreOnSubjectId'],
    dateField: 'createAt',
  },
  studentOnAssignments: {
    model: 'studentOnAssignment',
    mongoCollection: 'StudentOnAssignment',
    filters: ['studentOnSubjectId', 'assignmentId', 'studentId', 'status'],
    groupBy: ['status', 'assignmentId', 'studentOnSubjectId'],
    sum: 'score',
    select: [
      'firstName',
      'lastName',
      'number',
      'score',
      'status',
      'isAssigned',
      'completedAt',
      'reviewdAt',
      'assignmentId',
      'studentOnSubjectId',
    ],
    dateField: 'createAt',
  },
  rubricScoreOnStudentAssignments: {
    model: 'rubricScoreOnStudentAssignment',
    mongoCollection: 'RubricScoreOnStudentAssignment',
    filters: ['studentOnAssignmentId', 'criterionId'],
    groupBy: ['criterionId', 'selectedLevelId', 'studentOnAssignmentId'],
    sum: 'points',
    select: ['points', 'comment', 'studentOnAssignmentId', 'criterionId', 'selectedLevelId'],
    dateField: 'createAt',
  },
  skillOnStudentAssignments: {
    model: 'skillOnStudentAssignment',
    mongoCollection: 'SkillOnStudentAssignment',
    filters: ['studentOnAssignmentId', 'studentId', 'skillId'],
    groupBy: ['skillId', 'studentId'],
    sum: 'weight',
    select: ['weight', 'skillId', 'studentId', 'studentOnAssignmentId'],
    dateField: 'createAt',
  },
  fileOnStudentAssignments: {
    model: 'fileOnStudentAssignment',
    mongoCollection: 'FileOnStudentAssignment',
    filters: ['assignmentId', 'studentId', 'studentOnAssignmentId'],
    groupBy: ['contentType'],
    select: [
      'name',
      'type',
      'contentType',
      'size',
      'createAt',
      'assignmentId',
      'studentOnAssignmentId',
    ],
    dateField: 'createAt',
  },
  commentOnAssignments: {
    model: 'commentOnAssignment',
    mongoCollection: 'CommentOnAssignment',
    filters: ['studentOnAssignmentId'],
    groupBy: [],
    select: ['content', 'firstName', 'lastName', 'createAt', 'studentOnAssignmentId'],
    dateField: 'createAt',
  },
  announcements: {
    model: 'announcement',
    mongoCollection: 'Announcement',
    filters: [],
    groupBy: [],
    select: ['title', 'content', 'firstName', 'lastName', 'createAt'],
    dateField: 'createAt',
  },
  commentOnAnnouncements: {
    model: 'commentOnAnnouncement',
    mongoCollection: 'CommentOnAnnouncement',
    filters: ['announcementId'],
    groupBy: [],
    select: ['content', 'firstName', 'lastName', 'createAt', 'announcementId'],
    dateField: 'createAt',
  },
  fileOnAnnouncements: {
    model: 'fileOnAnnouncement',
    mongoCollection: 'FileOnAnnouncement',
    filters: ['announcementId'],
    groupBy: [],
    select: ['name', 'type', 'size', 'createAt', 'announcementId'],
    dateField: 'createAt',
  },
  fileOnAssignments: {
    model: 'fileOnAssignment',
    mongoCollection: 'FileOnAssignment',
    filters: ['assignmentId'],
    groupBy: [],
    select: ['name', 'type', 'size', 'createAt', 'assignmentId'],
    dateField: 'createAt',
  },
  questionOnVideos: {
    model: 'questionOnVideo',
    mongoCollection: 'QuestionOnVideo',
    filters: ['assignmentId'],
    groupBy: [],
    select: ['question', 'options', 'correctOptions', 'timestamp', 'assignmentId'],
    dateField: 'createAt',
  },
};

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 100;
const MAX_RESULT_CHARS = 60_000;

@Injectable()
export class SubjectQueryToolService {
  private readonly logger = new Logger(SubjectQueryToolService.name);

  constructor(private prismaRead: PrismaReadService) {}

  /** Gemini function declarations, generated from COLLECTION_CONFIG. */
  get functionDeclarations() {
    const perCollection = Object.entries(COLLECTION_CONFIG)
      .map(
        ([name, c]) =>
          `- ${name}: filters(${c.filters.join(', ') || 'none'}); groupBy(${c.groupBy.join(', ') || 'none'})`,
      )
      .join('\n');
    return [
      {
        name: 'get_student_summary',
        description:
          'Fetch EVERYTHING about ONE student in this subject in a single call: student info, ' +
          'attendance summary by status plus recent attendance records (สรุปการเข้าเรียน), ' +
          'behavior scores (คะแนนพฤติกรรม) with per-title totals (behaviorScoreByTitle: how many times and how many points per title) plus recent events, ' +
          'assignment submission status and scores (สถานะการส่งงาน), ' +
          "teacher comments on the student's assignments, and rubric scores with " +
          'resolved criterion and level titles (criterionTitle/levelTitle). ' +
          'ALWAYS use this first when the user asks about a specific student (by name or number) ' +
          'or wants a summary of a student.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            studentOnSubjectId: {
              type: 'string',
              description:
                "The student's studentOnSubjectId, taken from the roster in the prompt.",
            },
          },
          required: ['studentOnSubjectId'],
        },
      },
      {
        name: 'query_subject_data',
        description:
          'Query detail rows or aggregates about the current subject from the database. ' +
          'Results are automatically scoped to this subject. Collections and their allowed keys:\n' +
          perCollection +
          '\nEvery collection also accepts dateFrom/dateTo (ISO 8601) in filters. ' +
          'IMPORTANT: to filter by a student from the roster, use studentOnSubjectId (the roster id) — ' +
          'studentId is a different, account-level id. ' +
          'Use mode "count" or "groupBy" for totals/averages instead of fetching many rows. ' +
          'groupBy returns per-group record counts and, where available, sums.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            collection: {
              type: 'string',
              enum: Object.keys(COLLECTION_CONFIG),
            },
            filters: {
              type: 'object',
              description:
                'Equality filters (string values), only keys listed for the collection, plus dateFrom/dateTo.',
            },
            mode: { type: 'string', enum: ['rows', 'count', 'groupBy'] },
            groupBy: { type: 'string', description: 'Required when mode is groupBy.' },
            limit: {
              type: 'integer',
              description: `Max rows for mode "rows" (1-${MAX_LIMIT}, default ${DEFAULT_LIMIT}).`,
            },
          },
          required: ['collection'],
        },
      },
    ];
  }

  /** Single dispatch point for tool calls coming back from the model. */
  async handleCall(
    subjectId: string,
    name: string | undefined,
    args: Record<string, unknown> | undefined,
  ): Promise<Record<string, unknown>> {
    if (name === 'get_student_summary') {
      return this.getStudentSummary(subjectId, args?.studentOnSubjectId as string);
    }
    if (name === 'query_subject_data') {
      return this.execute(subjectId, (args ?? {}) as SubjectQueryArgs);
    }
    return { error: `Unknown tool "${name}".` };
  }

  /**
   * One-shot full picture of a single student. Every query is anchored on
   * subjectId + required indexed fields; comments/rubric scores use an `in`
   * filter over the student's own studentOnAssignment ids (required + indexed).
   */
  async getStudentSummary(
    subjectId: string,
    studentOnSubjectId: string | undefined,
  ): Promise<Record<string, unknown>> {
    if (typeof studentOnSubjectId !== 'string' || studentOnSubjectId.length === 0) {
      return { error: 'studentOnSubjectId (from the roster) is required.' };
    }

    try {
      const student = await this.prismaRead.studentOnSubject.findFirst({
        where: { id: studentOnSubjectId, subjectId },
        select: {
          id: true,
          title: true,
          firstName: true,
          lastName: true,
          number: true,
          totalSpeicalScore: true,
          isActive: true,
        },
      });
      if (!student) {
        return {
          error:
            'No student with this studentOnSubjectId in this subject — take the id from the roster in the prompt.',
        };
      }

      const where = { subjectId, studentOnSubjectId };
      const [
        attendanceByStatus,
        recentAttendances,
        behaviorScores,
        behaviorScoreByTitle,
        assignments,
      ] = await Promise.all([
          this.prismaRead.attendance.groupBy({
            by: ['status'],
            where,
            _count: { _all: true },
          }),
          this.prismaRead.attendance.findMany({
            where,
            select: { startDate: true, status: true, note: true },
            orderBy: { startDate: 'desc' },
            take: 100,
          }),
          this.prismaRead.scoreOnStudent.findMany({
            where,
            select: { title: true, score: true, createAt: true },
            orderBy: { createAt: 'desc' },
            take: 200,
          }),
          // Exact per-title totals (DB-side, so correct even past the
          // 200-recent-rows cap): "for this title, N times, X points".
          this.prismaRead.scoreOnStudent.groupBy({
            by: ['title'],
            where,
            _count: { _all: true },
            _sum: { score: true },
          }),
          this.prismaRead.studentOnAssignment.findMany({
            where,
            select: {
              id: true,
              assignmentId: true,
              status: true,
              score: true,
              isAssigned: true,
              completedAt: true,
              reviewdAt: true,
            },
          }),
        ]);

      const studentOnAssignmentIds = assignments.map((a) => a.id);
      const [teacherComments, rawRubricScores] =
        studentOnAssignmentIds.length === 0
          ? [[], []]
          : await Promise.all([
              this.prismaRead.commentOnAssignment.findMany({
                where: {
                  subjectId,
                  studentOnAssignmentId: { in: studentOnAssignmentIds },
                },
                select: {
                  content: true,
                  firstName: true,
                  lastName: true,
                  createAt: true,
                  studentOnAssignmentId: true,
                },
                orderBy: { createAt: 'desc' },
                take: 100,
              }),
              this.prismaRead.rubricScoreOnStudentAssignment.findMany({
                where: {
                  subjectId,
                  studentOnAssignmentId: { in: studentOnAssignmentIds },
                },
                select: {
                  points: true,
                  comment: true,
                  criterionId: true,
                  selectedLevelId: true,
                  studentOnAssignmentId: true,
                },
              }),
            ]);

      // Resolve criterion/level ids to their titles server-side so the answer
      // can say "criterion X: level Y (N points)" without the model having to
      // join ids against the rubric tree itself.
      let rubricScores: Record<string, unknown>[] = rawRubricScores;
      if (rawRubricScores.length > 0) {
        const rubricTree = await this.prismaRead.rubric.findMany({
          where: { subjectId },
          select: {
            criteria: {
              select: {
                id: true,
                title: true,
                levels: { select: { id: true, title: true, points: true } },
              },
            },
          },
        });
        const criterionTitles = new Map<string, string>();
        const levelTitles = new Map<string, string>();
        for (const rubric of rubricTree) {
          for (const criterion of rubric.criteria) {
            criterionTitles.set(criterion.id, criterion.title);
            for (const level of criterion.levels) {
              levelTitles.set(level.id, level.title);
            }
          }
        }
        rubricScores = rawRubricScores.map((score) => ({
          ...score,
          criterionTitle: criterionTitles.get(score.criterionId) ?? null,
          levelTitle: levelTitles.get(score.selectedLevelId) ?? null,
        }));
      }

      return this.capped({
        student,
        attendanceByStatus,
        recentAttendances,
        behaviorScoreByTitle,
        behaviorScoreTotal: behaviorScoreByTitle.reduce(
          (sum, group: any) => sum + (group._sum?.score ?? 0),
          0,
        ),
        recentBehaviorScores: behaviorScores,
        assignments,
        teacherComments,
        rubricScores,
      });
    } catch (error) {
      this.logger.error(
        `get_student_summary failed for ${studentOnSubjectId}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
      return { error: 'Student summary query failed.' };
    }
  }

  /**
   * Validate and run one tool call. Never throws for bad model input — returns
   * `{ error }` so the model can self-correct within its rounds.
   */
  async execute(
    subjectId: string,
    args: SubjectQueryArgs,
  ): Promise<Record<string, unknown>> {
    const config = COLLECTION_CONFIG[args.collection ?? ''];
    if (!config) {
      return {
        error: `Unknown collection "${args.collection}". Allowed: ${Object.keys(COLLECTION_CONFIG).join(', ')}`,
      };
    }

    const mode: QueryMode = args.mode ?? 'rows';
    if (!['rows', 'count', 'groupBy'].includes(mode)) {
      return { error: `Unknown mode "${args.mode}". Allowed: rows, count, groupBy` };
    }

    const where: Record<string, unknown> = { subjectId };
    for (const [key, value] of Object.entries(args.filters ?? {})) {
      if (key === 'subjectId' || key === 'schoolId') {
        return { error: `Filter "${key}" is set by the server and cannot be supplied.` };
      }
      if (key === 'dateFrom' || key === 'dateTo') {
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) {
          return { error: `Invalid ${key} "${value}" — use an ISO 8601 date.` };
        }
        const range = (where[config.dateField] as Record<string, Date>) ?? {};
        range[key === 'dateFrom' ? 'gte' : 'lte'] = date;
        where[config.dateField] = range;
        continue;
      }
      if (!config.filters.includes(key)) {
        return {
          error: `Filter "${key}" is not allowed on ${args.collection}. Allowed: ${config.filters.join(', ') || 'none'}, dateFrom, dateTo`,
        };
      }
      if (typeof value !== 'string' || value.length === 0 || value.length > 100) {
        return { error: `Filter "${key}" must be a non-empty string.` };
      }
      where[key] = value;
    }

    const delegate = (this.prismaRead as any)[config.model];

    try {
      if (mode === 'count') {
        const count = await delegate.count({ where });
        return { collection: args.collection, mode, count };
      }

      if (mode === 'groupBy') {
        if (!args.groupBy || !config.groupBy.includes(args.groupBy)) {
          return {
            error: `groupBy "${args.groupBy}" is not allowed on ${args.collection}. Allowed: ${config.groupBy.join(', ') || 'none'}`,
          };
        }
        const groups = await delegate.groupBy({
          by: [args.groupBy],
          where,
          _count: { _all: true },
          ...(config.sum ? { _sum: { [config.sum]: true } } : {}),
        });
        return this.capped({ collection: args.collection, mode, groups });
      }

      const limit = Math.min(
        Math.max(Math.floor(Number(args.limit) || DEFAULT_LIMIT), 1),
        MAX_LIMIT,
      );
      const select: Record<string, boolean> = { id: true };
      for (const field of config.select) select[field] = true;
      const rows = await delegate.findMany({
        where,
        select,
        take: limit,
        orderBy: { [config.dateField]: 'desc' },
      });
      return this.capped({ collection: args.collection, mode, returned: rows.length, rows });
    } catch (error) {
      this.logger.error(
        `query_subject_data failed on ${args.collection}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
      return { error: 'Query failed. Try different filters or another collection.' };
    }
  }

  private capped(result: Record<string, unknown>): Record<string, unknown> {
    const size = JSON.stringify(result).length;
    if (size > MAX_RESULT_CHARS) {
      return {
        error: `Result too large (${size} chars). Narrow the filters, lower the limit, or use mode "count"/"groupBy".`,
      };
    }
    return result;
  }

  /**
   * Small collections sent directly in the first prompt so the model can
   * resolve names (students, assignments, dates) to ids without tool rounds.
   * Worst measured subject ≈ 40-60k chars.
   */
  async getPreamble(subjectId: string) {
    const [
      subject,
      students,
      assignments,
      attendanceTables,
      attendanceRows,
      attendanceStatusLists,
      gradeRange,
      scoreOnSubjects,
      teachers,
      groups,
      units,
      studentOnGroups,
      rubrics,
    ] = await Promise.all([
      this.prismaRead.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, title: true, description: true, educationYear: true, code: true },
      }),
      this.prismaRead.studentOnSubject.findMany({
        where: { subjectId, isActive: true },
        select: {
          id: true,
          title: true,
          firstName: true,
          lastName: true,
          number: true,
          totalSpeicalScore: true,
        },
        orderBy: { number: 'asc' },
      }),
      this.prismaRead.assignment.findMany({
        where: { subjectId, status: 'Published' },
        select: {
          id: true,
          title: true,
          description: true,
          maxScore: true,
          weight: true,
          type: true,
          beginDate: true,
          dueDate: true,
          rubricId: true,
        },
        orderBy: { beginDate: 'asc' },
      }),
      this.prismaRead.attendanceTable.findMany({
        where: { subjectId },
        select: { id: true, title: true },
      }),
      this.prismaRead.attendanceRow.findMany({
        where: { subjectId },
        select: {
          id: true,
          startDate: true,
          endDate: true,
          note: true,
          type: true,
          attendanceTableId: true,
        },
        orderBy: { startDate: 'asc' },
      }),
      this.prismaRead.attendanceStatusList.findMany({
        where: { subjectId },
        select: { title: true, value: true, attendanceTableId: true, isHidden: true },
      }),
      this.prismaRead.gradeRange.findUnique({
        where: { subjectId },
        select: { gradeRules: true },
      }),
      this.prismaRead.scoreOnSubject.findMany({
        where: { subjectId, isDeleted: false },
        select: { id: true, title: true, score: true, maxScore: true, weight: true },
      }),
      this.prismaRead.teacherOnSubject.findMany({
        where: { subjectId },
        select: { firstName: true, lastName: true, role: true, status: true },
      }),
      this.prismaRead.groupOnSubject.findMany({
        where: { subjectId },
        select: { id: true, title: true, description: true },
      }),
      this.prismaRead.unitOnGroup.findMany({
        where: { subjectId },
        select: { id: true, title: true, totalScore: true, groupOnSubjectId: true },
      }),
      this.prismaRead.studentOnGroup.findMany({
        where: { subjectId },
        select: {
          studentOnSubjectId: true,
          unitOnGroupId: true,
          groupOnSubjectId: true,
          firstName: true,
          lastName: true,
        },
      }),
      this.prismaRead.rubric.findMany({
        where: { subjectId },
        select: {
          id: true,
          title: true,
          criteria: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              weight: true,
              levels: {
                orderBy: { order: 'asc' },
                select: { id: true, title: true, points: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      subject,
      // Long assignment descriptions are reference material, not roster data.
      assignments: assignments.map((a) => ({
        ...a,
        description: a.description ? a.description.slice(0, 200) : a.description,
      })),
      // Expose the roster id under its real filter name — a bare `id` tempts
      // the model into passing it as `studentId` (a different, account-level
      // id), which silently matches nothing.
      students: students.map(({ id, ...rest }) => ({
        studentOnSubjectId: id,
        ...rest,
      })),
      attendanceTables,
      attendanceRows,
      attendanceStatusLists,
      gradeRules: gradeRange?.gradeRules ?? null,
      scoreOnSubjects,
      teachers,
      groups,
      units,
      studentOnGroups,
      rubrics,
    };
  }
}
