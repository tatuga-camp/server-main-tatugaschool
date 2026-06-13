import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaReadService } from '../prisma/prisma-read.service';
import { RedisService } from '../redis/redis.service';
import { SchoolAnalytics } from './interfaces/school-analytics.interface';

// Raw rows gathered for one school+year, before scoring.
export type RawAnalyticsData = {
  subjects: Array<{ id: string; title: string }>;
  subjectIds: string[];
  // one row per StudentOnSubject (a student may appear in several subjects)
  enrollments: Array<{
    studentId: string;
    classId: string;
    subjectId: string;
    firstName: string;
    lastName: string;
    number: string;
    photo: string;
    title: string;
  }>;
  classes: Array<{ id: string; title: string; level: string }>;
  studentOnAssignments: Array<{
    studentId: string;
    subjectId: string;
    status: string; // PENDDING | SUBMITTED | IMPROVED | REVIEWD
    isAssigned: boolean;
    score: number | null;
    completedAt: Date | null;
    assignmentStatus: string; // Published | Draft
    assignmentDueDate: Date | null;
    assignmentMaxScore: number | null;
  }>;
  attendances: Array<{
    studentId: string;
    subjectId: string;
    status: string;
    attendanceTableId: string;
  }>;
  // status title -> value, per attendance table (value -1 == absent)
  attendanceStatusValues: Array<{
    attendanceTableId: string;
    title: string;
    value: number;
  }>;
  // teachers per subject (TeacherOnSubject, ACCEPT only)
  teacherOnSubjects: Array<{
    userId: string;
    subjectId: string;
    firstName: string;
    lastName: string;
    photo: string;
  }>;
};

@Injectable()
export class AnalyticsRepository {
  private logger = new Logger(AnalyticsRepository.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly redis: RedisService,
  ) {}

  cacheKey(schoolId: string, educationYear: string): string {
    // Bump the `vN` segment whenever the SchoolAnalytics payload shape changes,
    // so older cached blobs (e.g. v1 without subject/teacher leaderboards) are
    // never read — the next request misses and recomputes the current shape.
    return `school_analytics:${schoolId}:${educationYear}`;
  }

  async getCached(
    schoolId: string,
    educationYear: string,
  ): Promise<SchoolAnalytics | null> {
    const raw = await this.redis.get(this.cacheKey(schoolId, educationYear));
    return raw ? (JSON.parse(raw) as SchoolAnalytics) : null;
  }

  async setCached(payload: SchoolAnalytics, ttlSeconds = 54000): Promise<void> {
    await this.redis.set(
      this.cacheKey(payload.schoolId, payload.educationYear),
      JSON.stringify(payload),
      'EX',
      ttlSeconds,
    );
  }

  async gatherRaw(
    schoolId: string,
    educationYear: string,
  ): Promise<RawAnalyticsData> {
    // SCALING NOTE: this loads the school+year's StudentOnAssignment, Attendance
    // and AttendanceStatusList rows into memory (indexed by schoolId/subjectId, but
    // uncapped). This is kept off the hot path by the 3x/day warm cache + on-demand
    // -on-miss; if a single school's dataset grows large, move steps 3-5 to a Mongo
    // $aggregate pipeline (spec approach C) rather than scoring in app memory.
    try {
      // 1. subjects for this school + year (uses @@index([educationYear, schoolId]))
      const subjects = await this.prismaRead.subject.findMany({
        where: { schoolId, educationYear, isDeleted: false },
        select: { id: true, title: true },
      });
      const subjectIds = subjects.map((s) => s.id);

      if (subjectIds.length === 0) {
        return {
          subjects: [],
          subjectIds: [],
          enrollments: [],
          classes: [],
          studentOnAssignments: [],
          attendances: [],
          attendanceStatusValues: [],
          teacherOnSubjects: [],
        };
      }

      // 2-6 run in parallel; all filtered by schoolId (+ subjectId) -> indexed.
      const [enrollmentsRaw, soa, attendances, statusLists, teacherOnSubjects] =
        await Promise.all([
          this.prismaRead.studentOnSubject.findMany({
            where: { schoolId, subjectId: { in: subjectIds }, isActive: true },
            select: {
              studentId: true,
              classId: true,
              subjectId: true,
              firstName: true,
              lastName: true,
              number: true,
              photo: true,
              title: true,
            },
          }),
          this.prismaRead.studentOnAssignment.findMany({
            where: { schoolId, subjectId: { in: subjectIds } },
            select: {
              studentId: true,
              subjectId: true,
              status: true,
              isAssigned: true,
              score: true,
              completedAt: true,
              assignment: {
                select: { status: true, dueDate: true, maxScore: true },
              },
            },
          }),
          this.prismaRead.attendance.findMany({
            where: { schoolId, subjectId: { in: subjectIds } },
            select: {
              studentId: true,
              subjectId: true,
              status: true,
              attendanceTableId: true,
            },
          }),
          this.prismaRead.attendanceStatusList.findMany({
            where: { schoolId, subjectId: { in: subjectIds } },
            select: { attendanceTableId: true, title: true, value: true },
          }),
          this.prismaRead.teacherOnSubject.findMany({
            where: {
              schoolId,
              subjectId: { in: subjectIds },
              status: 'ACCEPT',
            },
            select: {
              userId: true,
              subjectId: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          }),
        ]);

      // classes referenced by the roster
      const classIds = [...new Set(enrollmentsRaw.map((e) => e.classId))];
      const classes = await this.prismaRead.class.findMany({
        where: { id: { in: classIds } },
        select: { id: true, title: true, level: true },
      });

      return {
        subjects,
        subjectIds,
        enrollments: enrollmentsRaw,
        classes,
        studentOnAssignments: soa.map((a) => ({
          studentId: a.studentId,
          subjectId: a.subjectId,
          status: a.status,
          isAssigned: a.isAssigned,
          score: a.score,
          completedAt: a.completedAt,
          assignmentStatus: a.assignment.status,
          assignmentDueDate: a.assignment.dueDate,
          assignmentMaxScore: a.assignment.maxScore,
        })),
        attendances,
        attendanceStatusValues: statusLists,
        teacherOnSubjects,
      };
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }

  async getStudentMissingAssignments(
    schoolId: string,
    studentId: string,
    educationYear: string,
  ): Promise<
    Array<{
      studentOnAssignmentId: string;
      assignmentId: string;
      title: string;
      subjectId: string;
      dueDate: Date | null;
    }>
  > {
    try {
      const subjects = await this.prismaRead.subject.findMany({
        where: { schoolId, educationYear, isDeleted: false },
        select: { id: true },
      });
      const subjectIds = subjects.map((s) => s.id);
      if (subjectIds.length === 0) return [];

      const rows = await this.prismaRead.studentOnAssignment.findMany({
        where: {
          schoolId,
          studentId,
          subjectId: { in: subjectIds },
          status: 'PENDDING',
          isAssigned: true,
          assignment: { is: { status: 'Published' } },
        },
        select: {
          id: true,
          assignmentId: true,
          subjectId: true,
          assignment: { select: { title: true, dueDate: true } },
        },
      });

      const now = Date.now();
      return rows
        .filter(
          (r) =>
            r.assignment.dueDate !== null &&
            new Date(r.assignment.dueDate).getTime() < now,
        )
        .map((r) => ({
          studentOnAssignmentId: r.id,
          assignmentId: r.assignmentId,
          title: r.assignment.title,
          subjectId: r.subjectId,
          dueDate: r.assignment.dueDate,
        }));
    } catch (error) {
      this.logger.error(error);
      if (error instanceof PrismaClientKnownRequestError) {
        throw new InternalServerErrorException(
          `message: ${error.message} - codeError: ${error.code}`,
        );
      }
      throw error;
    }
  }
}
