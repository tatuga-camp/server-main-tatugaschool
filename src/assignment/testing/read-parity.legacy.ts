import { ForbiddenException } from '@nestjs/common';
import { Db, Row, project } from './read-parity.db';
import { toStudentSafeSubmission } from '../../quiz/student-question.mapper';

export const json = (v: unknown) => JSON.parse(JSON.stringify(v));
export const OMIT = { vector: true, vectorResouce: true };
export const noEmbedding = (a: Row) => project(a, { omit: OMIT });
// Deliberate change since 6581991 (quiz test mode): student callers get the
// submission with the quiz attempt reduced to its timestamps.
const studentSafe = (s: Row | undefined) => s && toStudentSafeSubmission(s);

// ── legacy restatements of commit 6581991 ──────────────────────────────────
export function legacyList(db: Db, subjectId: string, studentId?: string) {
  let mine: Row[] = [];
  if (studentId) {
    const sos = db.studentOnSubject.find(
      (s) => s.studentId === studentId && s.subjectId === subjectId,
    );
    if (!sos) throw new ForbiddenException();
    mine = db.studentOnAssignment.filter(
      (s) =>
        s.subjectId === subjectId &&
        s.studentOnSubjectId === sos.id &&
        s.isAssigned === true,
    );
  }
  let assignments =
    studentId && mine.length === 0
      ? []
      : db.assignment
          .filter((a) =>
            studentId
              ? mine.map((s) => s.assignmentId).includes(a.id)
              : a.subjectId === subjectId,
          )
          .map(noEmbedding);
  if (studentId)
    assignments = assignments.filter((a) => a.status === 'Published');
  const all = db.studentOnAssignment.filter((s) => s.subjectId === subjectId);
  const ids = assignments.map((a) => a.id);
  const files = db.fileOnAssignment.filter((f) => ids.includes(f.assignmentId));
  const videoIds = assignments
    .filter((a) => a.type === 'VideoQuiz')
    .map((a) => a.id);
  const questions = db.questionOnVideo.filter((q) =>
    videoIds.includes(q.assignmentId),
  );
  return assignments.map((assignment) => {
    const s = all.filter((x) => x.assignmentId === assignment.id);
    return {
      ...assignment,
      questions: questions.filter((q) => q.assignmentId === assignment.id),
      studentAssign: s.length,
      summitNumber: s.filter((x) => x.status === 'SUBMITTED').length,
      penddingNumber: s.filter(
        (x) => x.status === 'PENDDING' && x.isAssigned === true,
      ).length,
      reviewNumber: s.filter((x) => x.status === 'REVIEWD').length,
      files: files.filter((f) => f.assignmentId === assignment.id) ?? [],
      studentOnAssignment:
        mine.length > 0
          ? studentSafe(mine.find((x) => x.assignmentId === assignment.id))
          : undefined,
    };
  });
}

export function legacyGrade(db: Db, subjectId: string) {
  const grade = db.gradeRange.find((g) => g.subjectId === subjectId);
  return grade ? { ...grade, gradeRules: JSON.parse(grade.gradeRules) } : null;
}

export function legacyStudentOverview(
  db: Db,
  subjectId: string,
  studentId: string,
) {
  const sos = db.studentOnSubject.find(
    (s) => s.subjectId === subjectId && s.studentId === studentId,
  )!;
  const assignments = db.assignment
    .filter(
      (a) =>
        a.subjectId === subjectId &&
        a.status === 'Published' &&
        a.type === 'Assignment',
    )
    .map(noEmbedding);
  const soas = db.studentOnAssignment.filter(
    (s) => s.studentOnSubjectId === sos.id,
  );
  const scoreOnStudents = db.scoreOnStudent.filter(
    (s) => s.studentOnSubjectId === sos.id,
  );
  return {
    grade: legacyGrade(db, subjectId),
    assignments: assignments.map((assignment) => ({
      assignment,
      studentOnAssignment: studentSafe(
        soas.find((s) => s.assignmentId === assignment.id),
      ),
    })),
    scoreOnSubjects: db.scoreOnSubject
      .filter((s) => s.subjectId === subjectId)
      .map((scoreOnSubject) => ({
        scoreOnSubject,
        students: scoreOnStudents.filter(
          (s) => s.scoreOnSubjectId === scoreOnSubject.id,
        ),
      })),
  };
}

export function legacyTeacherOverview(db: Db, subjectId: string) {
  const assignments = db.assignment
    .filter(
      (a) =>
        a.subjectId === subjectId &&
        a.status === 'Published' &&
        (a.type === 'Assignment' || a.type === 'VideoQuiz'),
    )
    .map(noEmbedding);
  const soas = db.studentOnAssignment.filter((s) => s.subjectId === subjectId);
  const scoreOnStudents = db.scoreOnStudent.filter(
    (s) => s.subjectId === subjectId,
  );
  return {
    grade: legacyGrade(db, subjectId),
    assignments: assignments.map((assignment) => ({
      assignment,
      students: soas.filter((s) => s.assignmentId === assignment.id),
    })),
    scoreOnSubjects: db.scoreOnSubject
      .filter((s) => s.subjectId === subjectId)
      .map((scoreOnSubject) => ({
        scoreOnSubject,
        students: scoreOnStudents.filter(
          (s) => s.scoreOnSubjectId === scoreOnSubject.id,
        ),
      })),
  };
}

// Fields the teacher client (client-main-tatugaschool: GradeTable, GradeCells,
// GradePopup, calculateStudentTotals, gradeColumns) reads from overview students[].
export const CLIENT_OVERVIEW_STUDENT_FIELDS = [
  'id',
  'assignmentId',
  'studentOnSubjectId',
  'score',
  'status',
  'firstName',
  'lastName',
  'number',
  'photo',
];
