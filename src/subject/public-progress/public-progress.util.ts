import type {
  Assignment,
  PublicProgressLevel,
  ScoreOnStudent,
  ScoreOnSubject,
  StudentAssignmentStatus,
  StudentOnAssignment,
  StudentOnSubject,
} from '@prisma/client';

export type GradeRule = { min: number; max: number; grade: string };

// Same defaults as GradeService / the teacher app's utils/grade.ts.
export const DEFAULT_GRADE_RULES: GradeRule[] = [
  { min: 80, max: 100, grade: '4' },
  { min: 75, max: 79, grade: '3.5' },
  { min: 70, max: 74, grade: '3' },
  { min: 65, max: 69, grade: '2.5' },
  { min: 60, max: 64, grade: '2' },
  { min: 55, max: 59, grade: '1.5' },
  { min: 50, max: 54, grade: '1' },
  { min: 0, max: 49, grade: '0' },
];

export type PublicProgressCellStatus = StudentAssignmentStatus | 'NONE';

export type PublicProgressCell = {
  status: PublicProgressCellStatus;
  score?: number;
};

export type PublicProgressColumn =
  | {
      kind: 'assignment';
      id: string;
      title: string;
      tag: string | null;
      scoreHidden: boolean;
      maxScore?: number;
      weight?: number | null;
    }
  | {
      kind: 'special';
      id: string;
      title: string;
      maxScore?: number | null;
      weight?: number | null;
    };

export type PublicProgressGroup = {
  tag: string;
  assignmentIds: string[];
  maxTotal?: number;
};

export type PublicProgressStudent = {
  id: string;
  number: string;
  title: string;
  firstName: string;
  lastName: string;
  photo: string;
  blurHash: string | null;
  submittedCount: number;
  assignedCount: number;
  cells: Record<string, PublicProgressCell>;
  groupTotals?: Record<string, number>;
  total?: number;
  grade?: string;
};

export type PublicProgress = {
  subject: { title: string; educationYear: string; className: string };
  level: PublicProgressLevel;
  columns: PublicProgressColumn[];
  groups: PublicProgressGroup[];
  maxTotal?: number;
  students: PublicProgressStudent[];
  updatedAt: string;
};

export type PublicProgressInputs = {
  subject: { title: string; educationYear: string };
  className: string;
  assignments: Pick<
    Assignment,
    'id' | 'title' | 'tags' | 'maxScore' | 'weight' | 'allowStudentViewScore'
  >[];
  studentOnAssignments: Pick<
    StudentOnAssignment,
    'assignmentId' | 'studentOnSubjectId' | 'status' | 'score'
  >[];
  scoreOnSubjects: Pick<ScoreOnSubject, 'id' | 'title' | 'maxScore' | 'weight'>[];
  scoreOnStudents: Pick<
    ScoreOnStudent,
    'scoreOnSubjectId' | 'studentOnSubjectId' | 'score'
  >[];
  studentOnSubjects: Pick<
    StudentOnSubject,
    | 'id'
    | 'number'
    | 'title'
    | 'firstName'
    | 'lastName'
    | 'photo'
    | 'blurHash'
    | 'isActive'
  >[];
  /** GradeRange.gradeRules — a JSON string, an already-parsed array, or null. */
  gradeRules: unknown;
  now: Date;
};

export function firstTag(tags: string[] | null | undefined): string | null {
  const tag = tags?.[0]?.trim();
  return tag ? tag : null;
}

/** Same math as the teacher Grade table's Total column. */
export function assignmentContribution(
  score: number | null | undefined,
  maxScore: number | null | undefined,
  weight: number | null | undefined,
): number {
  const raw = score ?? 0;
  if (weight === null || weight === undefined) return raw;
  if (!maxScore) return 0;
  return (raw / maxScore) * weight;
}

export function specialContribution(
  sumRaw: number,
  maxScore: number | null | undefined,
  weight: number | null | undefined,
): number {
  if (weight === null || weight === undefined) return sumRaw;
  const max = maxScore ?? 100;
  if (!max) return 0;
  return (Math.min(sumRaw, max) / max) * weight;
}

// An empty stored array stays empty (grade 'N/A'), matching the teacher
// table's `gradeRules ?? defaultGradeRule`.
export function parseGradeRules(raw: unknown): GradeRule[] {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(value) ? (value as GradeRule[]) : DEFAULT_GRADE_RULES;
  } catch {
    return DEFAULT_GRADE_RULES;
  }
}

/**
 * The share token is teacher-only. Student and unauthenticated subject
 * responses (e.g. GET v1/subjects/code/:code) must go through this.
 */
export function withoutPublicProgressToken<
  T extends { publicProgressToken?: string | null },
>(subject: T): T {
  return { ...subject, publicProgressToken: null };
}

export function gradeFor(rules: GradeRule[], total: number): string {
  return (
    [...rules].sort((a, b) => b.min - a.min).find((rule) => total >= rule.min)
      ?.grade || 'N/A'
  );
}

/**
 * Builds the public progress payload. ALL level filtering happens here:
 * keys a level does not allow are omitted (not blanked), and hidden-score
 * assignments never carry a score or count toward the visible totals.
 */
export function buildPublicProgress(
  inputs: PublicProgressInputs,
  level: PublicProgressLevel,
): PublicProgress {
  const showScores = level !== 'STATUS';
  const showGrade = level === 'GRADE';
  const rules = parseGradeRules(inputs.gradeRules);

  const isHidden = (a: PublicProgressInputs['assignments'][number]) =>
    a.allowStudentViewScore === false;
  const assignmentMax = (a: PublicProgressInputs['assignments'][number]) =>
    a.weight ?? a.maxScore ?? 0;

  const workByKey = new Map<
    string,
    PublicProgressInputs['studentOnAssignments'][number]
  >();
  for (const work of inputs.studentOnAssignments) {
    workByKey.set(`${work.assignmentId}:${work.studentOnSubjectId}`, work);
  }

  const specialSums = new Map<string, number>();
  for (const entry of inputs.scoreOnStudents) {
    const key = `${entry.scoreOnSubjectId}:${entry.studentOnSubjectId}`;
    specialSums.set(key, (specialSums.get(key) ?? 0) + entry.score);
  }

  const columns: PublicProgressColumn[] = inputs.assignments.map((a) => ({
    kind: 'assignment' as const,
    id: a.id,
    title: a.title,
    tag: firstTag(a.tags),
    scoreHidden: isHidden(a),
    ...(showScores && { maxScore: a.maxScore ?? 0, weight: a.weight ?? null }),
  }));
  if (showScores) {
    for (const special of inputs.scoreOnSubjects) {
      columns.push({
        kind: 'special',
        id: special.id,
        title: special.title,
        maxScore: special.maxScore ?? null,
        weight: special.weight ?? null,
      });
    }
  }

  const groupMap = new Map<string, PublicProgressGroup>();
  for (const a of inputs.assignments) {
    const tag = firstTag(a.tags);
    if (!tag) continue;
    let group = groupMap.get(tag);
    if (!group) {
      group = { tag, assignmentIds: [], ...(showScores && { maxTotal: 0 }) };
      groupMap.set(tag, group);
    }
    group.assignmentIds.push(a.id);
    if (showScores && !isHidden(a)) {
      group.maxTotal = (group.maxTotal ?? 0) + assignmentMax(a);
    }
  }
  const groups = [...groupMap.values()];

  const maxTotal =
    inputs.assignments
      .filter((a) => !isHidden(a))
      .reduce((sum, a) => sum + assignmentMax(a), 0) +
    inputs.scoreOnSubjects.reduce((sum, s) => sum + (s.weight ?? 0), 0);

  const students = inputs.studentOnSubjects
    .filter((student) => student.isActive)
    .sort((a, b) => Number(a.number) - Number(b.number))
    .map((student): PublicProgressStudent => {
      const cells: Record<string, PublicProgressCell> = {};
      const groupTotals: Record<string, number> = {};
      for (const group of groups) groupTotals[group.tag] = 0;
      let visibleTotal = 0;
      let realTotal = 0;
      let submittedCount = 0;
      let assignedCount = 0;

      for (const a of inputs.assignments) {
        const work = workByKey.get(`${a.id}:${student.id}`);
        if (!work) {
          cells[a.id] = { status: 'NONE' };
          continue;
        }
        assignedCount += 1;
        if (work.status !== 'PENDDING') submittedCount += 1;
        const contribution = assignmentContribution(
          work.score,
          a.maxScore,
          a.weight,
        );
        realTotal += contribution;
        const cell: PublicProgressCell = { status: work.status };
        if (showScores && !isHidden(a)) {
          if (work.status === 'REVIEWD') cell.score = contribution;
          visibleTotal += contribution;
          const tag = firstTag(a.tags);
          if (tag) groupTotals[tag] += contribution;
        }
        cells[a.id] = cell;
      }

      for (const special of inputs.scoreOnSubjects) {
        const key = `${special.id}:${student.id}`;
        const contribution = specialContribution(
          specialSums.get(key) ?? 0,
          special.maxScore,
          special.weight,
        );
        realTotal += contribution;
        if (showScores) {
          cells[special.id] = specialSums.has(key)
            ? { status: 'REVIEWD', score: contribution }
            : { status: 'NONE' };
          visibleTotal += contribution;
        }
      }

      return {
        id: student.id,
        number: student.number,
        title: student.title,
        firstName: student.firstName,
        lastName: student.lastName,
        photo: student.photo,
        blurHash: student.blurHash ?? null,
        submittedCount,
        assignedCount,
        cells,
        ...(showScores && { groupTotals, total: visibleTotal }),
        ...(showGrade && { grade: gradeFor(rules, realTotal) }),
      };
    });

  return {
    subject: {
      title: inputs.subject.title,
      educationYear: inputs.subject.educationYear,
      className: inputs.className,
    },
    level,
    columns,
    groups,
    ...(showScores && { maxTotal }),
    students,
    updatedAt: inputs.now.toISOString(),
  };
}
