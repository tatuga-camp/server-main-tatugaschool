export type SubjectScopeKind =
  | 'assignments'
  | 'submissions'
  | 'attendance'
  | 'roster'
  | 'grades'
  | 'wordcloud';

export const ALL_SUBJECT_SCOPE_KINDS: SubjectScopeKind[] = [
  'assignments',
  'submissions',
  'attendance',
  'roster',
  'grades',
  'wordcloud',
];

export function subjectScope(
  subjectId: string,
  kind: SubjectScopeKind,
): string {
  return `subject:${subjectId}:${kind}`;
}

export function schoolMembersScope(schoolId: string): string {
  return `school:${schoolId}:members`;
}

export function subjectIdsOf(
  data: { subjectId?: string } | { subjectId?: string }[] | undefined,
): string[] {
  const items = Array.isArray(data) ? data : data ? [data] : [];
  return [...new Set(items.map((i) => i.subjectId).filter(Boolean))];
}
