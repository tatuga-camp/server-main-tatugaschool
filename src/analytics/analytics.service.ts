import { Injectable, Logger } from '@nestjs/common';
import { UserJwtPayload } from '../interfaces/jwt-payload';
import { MemberOnSchoolService } from '../member-on-school/member-on-school.service';
import { AnalyticsRepository, RawAnalyticsData } from './analytics.repository';
import {
  AtRiskStudent,
  SchoolAnalytics,
  StudentInsightDetail,
} from './interfaces/school-analytics.interface';
import {
  computeRiskScore,
  StudentSignals,
  tierFor,
} from './analytics.scoring';

type Accumulator = {
  studentId: string;
  classId: string;
  firstName: string;
  lastName: string;
  number: string;
  photo: string;
  assignedPublished: number;
  overdueUnsubmitted: number;
  gradedSum: number; // sum of (score/maxScore)*100
  gradedCount: number;
  absentCount: number;
  attendanceTotal: number;
};

// Contiguous buckets: [min, max) except the last, which is inclusive of 100.
const SCORE_BUCKETS = [
  { bucket: '0-49', min: 0, max: 50 },
  { bucket: '50-59', min: 50, max: 60 },
  { bucket: '60-69', min: 60, max: 70 },
  { bucket: '70-79', min: 70, max: 80 },
  { bucket: '80-89', min: 80, max: 90 },
  { bucket: '90-100', min: 90, max: 100.0001 },
];

@Injectable()
export class AnalyticsService {
  private logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly memberOnSchoolService: MemberOnSchoolService,
  ) {}

  async getAnalytics(
    user: UserJwtPayload,
    schoolId: string,
    educationYear: string,
  ): Promise<SchoolAnalytics> {
    await this.memberOnSchoolService.validateAccess({ user, schoolId });

    const cached = await this.repo.getCached(schoolId, educationYear);
    if (cached) return cached;

    const fresh = await this.compute(schoolId, educationYear, 'on-demand');
    await this.repo.setCached(fresh);
    return fresh;
  }

  /** Forced recompute used by the scheduler's recompute endpoint. */
  async recompute(schoolId: string, educationYear: string): Promise<SchoolAnalytics> {
    const fresh = await this.compute(schoolId, educationYear, 'scheduled');
    await this.repo.setCached(fresh);
    return fresh;
  }

  async compute(
    schoolId: string,
    educationYear: string,
    source: 'scheduled' | 'on-demand',
  ): Promise<SchoolAnalytics> {
    const raw = await this.repo.gatherRaw(schoolId, educationYear);
    return this.build(schoolId, educationYear, source, raw);
  }

  private build(
    schoolId: string,
    educationYear: string,
    source: 'scheduled' | 'on-demand',
    raw: RawAnalyticsData,
  ): SchoolAnalytics {
    const now = Date.now();

    // status title -> value, scoped per attendance table
    const statusValue = new Map<string, number>();
    for (const s of raw.attendanceStatusValues) {
      statusValue.set(`${s.attendanceTableId}::${s.title}`, s.value);
    }

    const classById = new Map(raw.classes.map((c) => [c.id, c]));

    // one accumulator per unique student (rolled up across subjects)
    const acc = new Map<string, Accumulator>();
    for (const e of raw.enrollments) {
      if (!acc.has(e.studentId)) {
        acc.set(e.studentId, {
          studentId: e.studentId,
          classId: e.classId,
          firstName: e.firstName,
          lastName: e.lastName,
          number: e.number,
          photo: e.photo,
          assignedPublished: 0,
          overdueUnsubmitted: 0,
          gradedSum: 0,
          gradedCount: 0,
          absentCount: 0,
          attendanceTotal: 0,
        });
      }
    }

    // assignments
    let onTimeEligible = 0;
    let onTimeMet = 0;
    let awaitingGradingCount = 0;
    for (const a of raw.studentOnAssignments) {
      const s = acc.get(a.studentId);
      if (!s) continue;
      const isPublished = a.assignmentStatus === 'Published';
      const submitted =
        a.status === 'SUBMITTED' || a.status === 'IMPROVED' || a.status === 'REVIEWD';
      const overdue =
        isPublished &&
        a.assignmentDueDate !== null &&
        new Date(a.assignmentDueDate).getTime() < now;
      // truly on-time: completed, and (no due date OR completed before it)
      const onTime =
        submitted &&
        a.completedAt !== null &&
        (a.assignmentDueDate === null ||
          new Date(a.completedAt).getTime() <= new Date(a.assignmentDueDate).getTime());

      if (isPublished && a.isAssigned) {
        s.assignedPublished += 1;
        // On-time rate is over work that has had a chance to be done:
        // already submitted, or past its due date. Not-yet-due unsubmitted
        // work is excluded so the rate isn't permanently dragged down by
        // freshly published assignments.
        if (submitted || overdue) {
          onTimeEligible += 1;
          if (onTime) onTimeMet += 1;
        }
        if (overdue && a.status === 'PENDDING') s.overdueUnsubmitted += 1;
      }
      if ((a.status === 'SUBMITTED' || a.status === 'IMPROVED') && isPublished) {
        awaitingGradingCount += 1;
      }
      if (a.status === 'REVIEWD' && a.score !== null && a.assignmentMaxScore && a.assignmentMaxScore > 0) {
        s.gradedSum += (a.score / a.assignmentMaxScore) * 100;
        s.gradedCount += 1;
      }
    }

    // attendance — only count rows belonging to the active roster, so the
    // school-wide present/absent/other totals stay consistent with the
    // per-student aggregates (both exclude inactive enrollments).
    let present = 0;
    let absent = 0;
    let other = 0;
    for (const att of raw.attendances) {
      const s = acc.get(att.studentId);
      if (!s) continue;
      const value = statusValue.get(`${att.attendanceTableId}::${att.status}`);
      s.attendanceTotal += 1;
      if (value === -1) {
        absent += 1;
        s.absentCount += 1;
      } else if (value !== undefined && value > 0) {
        present += 1;
      } else {
        other += 1;
      }
    }

    // score each student
    const atRiskStudents: AtRiskStudent[] = [];
    const perStudentAvg: number[] = [];
    const classRollup = new Map<string, { atRisk: number; scoreSum: number; scoreCount: number; count: number }>();

    for (const s of acc.values()) {
      const avgScorePercent = s.gradedCount > 0 ? s.gradedSum / s.gradedCount : null;
      if (avgScorePercent !== null) perStudentAvg.push(avgScorePercent);

      const signals: StudentSignals = {
        missing: { overdueUnsubmitted: s.overdueUnsubmitted, assignedPublished: s.assignedPublished },
        avgScorePercent,
        attendance: { absentCount: s.absentCount, totalRecords: s.attendanceTotal },
      };
      const { score, limitedData } = computeRiskScore(signals);
      const tier = tierFor(score);

      const cls = classById.get(s.classId);
      const roll = classRollup.get(s.classId) ?? { atRisk: 0, scoreSum: 0, scoreCount: 0, count: 0 };
      roll.count += 1;
      if (avgScorePercent !== null) {
        roll.scoreSum += avgScorePercent;
        roll.scoreCount += 1;
      }
      if (tier === 'HIGH' || tier === 'MEDIUM') roll.atRisk += 1;
      classRollup.set(s.classId, roll);

      if (tier === 'HIGH' || tier === 'MEDIUM') {
        atRiskStudents.push({
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          number: s.number,
          photo: s.photo,
          classId: s.classId,
          className: cls?.title ?? '',
          riskScore: score,
          tier,
          limitedData,
          signals: {
            missingCount: s.overdueUnsubmitted,
            missingRate: s.assignedPublished > 0 ? s.overdueUnsubmitted / s.assignedPublished : 0,
            avgScorePercent,
            absentCount: s.absentCount,
            absentRate: s.attendanceTotal > 0 ? s.absentCount / s.attendanceTotal : null,
          },
        });
      }
    }

    atRiskStudents.sort((a, b) => b.riskScore - a.riskScore);

    const atRiskStudentIds = new Set(atRiskStudents.map((s) => s.studentId));

    const highRiskCount = atRiskStudents.filter((s) => s.tier === 'HIGH').length;
    const mediumRiskCount = atRiskStudents.filter((s) => s.tier === 'MEDIUM').length;

    const avgScorePercent =
      perStudentAvg.length > 0
        ? perStudentAvg.reduce((sum, v) => sum + v, 0) / perStudentAvg.length
        : 0;

    const scoreDistribution = SCORE_BUCKETS.map((b) => ({
      bucket: b.bucket,
      count: perStudentAvg.filter((v) => v >= b.min && v < b.max).length,
    }));

    const attendanceTotalAll = present + absent + other;

    const classLeaderboard = raw.classes
      .map((c) => {
        const roll = classRollup.get(c.id);
        return {
          classId: c.id,
          title: c.title,
          level: c.level,
          studentCount: roll?.count ?? 0,
          atRiskCount: roll?.atRisk ?? 0,
          avgScorePercent:
            roll && roll.scoreCount > 0 ? Math.round(roll.scoreSum / roll.scoreCount) : 0,
        };
      })
      .filter((c) => c.studentCount > 0)
      .sort((a, b) => b.atRiskCount - a.atRiskCount);

    // ---- Subject leaderboard ----
    // enrolled (active) students per subject
    const studentsBySubject = new Map<string, Set<string>>();
    for (const e of raw.enrollments) {
      if (!acc.has(e.studentId)) continue; // active roster only
      const set = studentsBySubject.get(e.subjectId) ?? new Set<string>();
      set.add(e.studentId);
      studentsBySubject.set(e.subjectId, set);
    }

    // attendance present/total per subject (active roster only)
    const attendBySubject = new Map<string, { present: number; total: number }>();
    for (const att of raw.attendances) {
      if (!acc.has(att.studentId)) continue;
      const value = statusValue.get(`${att.attendanceTableId}::${att.status}`);
      const a = attendBySubject.get(att.subjectId) ?? { present: 0, total: 0 };
      a.total += 1;
      if (value !== undefined && value > 0) a.present += 1;
      attendBySubject.set(att.subjectId, a);
    }

    // graded avg % per subject (REVIEWD work)
    const gradedBySubject = new Map<string, { sum: number; count: number }>();
    for (const a of raw.studentOnAssignments) {
      if (!acc.has(a.studentId)) continue;
      if (
        a.status === 'REVIEWD' &&
        a.score !== null &&
        a.assignmentMaxScore &&
        a.assignmentMaxScore > 0
      ) {
        const g = gradedBySubject.get(a.subjectId) ?? { sum: 0, count: 0 };
        g.sum += (a.score / a.assignmentMaxScore) * 100;
        g.count += 1;
        gradedBySubject.set(a.subjectId, g);
      }
    }

    // teachers per subject
    const teachersBySubject = new Map<
      string,
      Array<{ userId: string; firstName: string; lastName: string; photo: string }>
    >();
    for (const t of raw.teacherOnSubjects) {
      const list = teachersBySubject.get(t.subjectId) ?? [];
      list.push({
        userId: t.userId,
        firstName: t.firstName,
        lastName: t.lastName,
        photo: t.photo,
      });
      teachersBySubject.set(t.subjectId, list);
    }

    const subjectLeaderboard = raw.subjects
      .map((subj) => {
        const students = studentsBySubject.get(subj.id) ?? new Set<string>();
        const attend = attendBySubject.get(subj.id);
        const graded = gradedBySubject.get(subj.id);
        let atRisk = 0;
        students.forEach((sid) => {
          if (atRiskStudentIds.has(sid)) atRisk += 1;
        });
        return {
          subjectId: subj.id,
          title: subj.title,
          attendanceRate: attend && attend.total > 0 ? attend.present / attend.total : 0,
          atRiskCount: atRisk,
          studentCount: students.size,
          avgScorePercent: graded && graded.count > 0 ? Math.round(graded.sum / graded.count) : 0,
          teachers: teachersBySubject.get(subj.id) ?? [],
        };
      })
      .filter((s) => s.studentCount > 0)
      .sort((a, b) => b.attendanceRate - a.attendanceRate);

    // ---- Teacher leaderboard (best = lowest at-risk rate) ----
    const teacherAgg = new Map<
      string,
      {
        firstName: string;
        lastName: string;
        photo: string;
        subjects: Set<string>;
        students: Set<string>;
        atRisk: Set<string>;
      }
    >();
    for (const t of raw.teacherOnSubjects) {
      const agg =
        teacherAgg.get(t.userId) ?? {
          firstName: t.firstName,
          lastName: t.lastName,
          photo: t.photo,
          subjects: new Set<string>(),
          students: new Set<string>(),
          atRisk: new Set<string>(),
        };
      agg.subjects.add(t.subjectId);
      const enrolled = studentsBySubject.get(t.subjectId);
      if (enrolled) {
        enrolled.forEach((sid) => {
          agg.students.add(sid);
          if (atRiskStudentIds.has(sid)) agg.atRisk.add(sid);
        });
      }
      teacherAgg.set(t.userId, agg);
    }

    const teacherLeaderboard = Array.from(teacherAgg.entries())
      .map(([userId, agg]) => ({
        userId,
        firstName: agg.firstName,
        lastName: agg.lastName,
        photo: agg.photo,
        subjectCount: agg.subjects.size,
        studentCount: agg.students.size,
        atRiskCount: agg.atRisk.size,
        atRiskRate: agg.students.size > 0 ? agg.atRisk.size / agg.students.size : 0,
      }))
      .filter((t) => t.studentCount > 0)
      .sort((a, b) => a.atRiskRate - b.atRiskRate);

    return {
      schoolId,
      educationYear,
      generatedAt: new Date(now).toISOString(),
      source,
      summary: {
        totalStudents: acc.size,
        atRiskCount: atRiskStudents.length,
        highRiskCount,
        mediumRiskCount,
        onTimeSubmissionRate: onTimeEligible > 0 ? onTimeMet / onTimeEligible : 0,
        awaitingGradingCount,
        attendanceRate: attendanceTotalAll > 0 ? present / attendanceTotalAll : 0,
        avgScorePercent: Math.round(avgScorePercent),
      },
      atRiskStudents,
      scoreDistribution,
      attendanceOverview: {
        present,
        absent,
        other,
        rate: attendanceTotalAll > 0 ? present / attendanceTotalAll : 0,
      },
      classLeaderboard,
      subjectLeaderboard,
      teacherLeaderboard,
    };
  }

  async getStudentDetail(
    user: UserJwtPayload,
    schoolId: string,
    studentId: string,
    educationYear: string,
  ): Promise<StudentInsightDetail> {
    await this.memberOnSchoolService.validateAccess({ user, schoolId });

    const missing = await this.repo.getStudentMissingAssignments(
      schoolId,
      studentId,
      educationYear,
    );

    // subject id -> title (single small query via the repo's subjects fetch)
    const raw = await this.repo.gatherRaw(schoolId, educationYear);
    const titleById = new Map(raw.subjects.map((s) => [s.id, s.title]));

    return {
      studentId,
      missingAssignments: missing.map((m) => ({
        studentOnAssignmentId: m.studentOnAssignmentId,
        assignmentId: m.assignmentId,
        title: m.title,
        subjectId: m.subjectId,
        subjectTitle: titleById.get(m.subjectId) ?? '',
        dueDate: m.dueDate ? new Date(m.dueDate).toISOString() : null,
      })),
    };
  }
}
