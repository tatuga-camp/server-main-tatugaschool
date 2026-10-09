// src/quiz/grading.ts
import { AssignmentOnQuiz, QuizScoringMode } from '@prisma/client';

export type GradableQuestion = Pick<
  AssignmentOnQuiz,
  'type' | 'points' | 'options' | 'blanks'
>;

export type QuizAnswerInput = {
  selectedOptionIds: string[];
  blankAnswers: { blankId: string; value: string }[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * NFC only reorders combining marks with a non-zero combining class, so it
 * fixes ปู่ (below vowel vs tone) but not กิ่ง or น้ำ (above vowels / SARA AM
 * have class 0). Move tone marks after vowel marks, and SARA AM after tone
 * marks, until stable.
 */
function reorderThaiMarks(value: string): string {
  let previous: string;
  let current = value;
  do {
    previous = current;
    current = current
      .replace(/([่-๋])([ัิ-ฺ็])/g, '$2$1')
      .replace(/(ำ)([่-๋])/g, '$2$1');
  } while (current !== previous);
  return current;
}

export function normalizeBlankAnswer(value: string): string {
  return reorderThaiMarks(value.normalize('NFC'))
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
}

export function gradeQuestion(
  question: GradableQuestion,
  answer: QuizAnswerInput | null,
  mode: QuizScoringMode,
): number {
  if (!answer) return 0;
  const points = question.points;

  if (question.type === 'SINGLE') {
    const correct = question.options.find((o) => o.isCorrect);
    if (!correct) return 0;
    return answer.selectedOptionIds.length === 1 &&
      answer.selectedOptionIds[0] === correct.id
      ? points
      : 0;
  }

  if (question.type === 'MULTIPLE') {
    const correctIds = new Set(
      question.options.filter((o) => o.isCorrect).map((o) => o.id),
    );
    if (correctIds.size === 0) return 0;
    const validIds = new Set(question.options.map((o) => o.id));
    const picked = new Set(
      answer.selectedOptionIds.filter((id) => validIds.has(id)),
    );
    const correctPicked = [...picked].filter((id) => correctIds.has(id)).length;
    const wrongPicked = picked.size - correctPicked;
    if (mode === 'ALL_OR_NOTHING') {
      return correctPicked === correctIds.size && wrongPicked === 0 ? points : 0;
    }
    return round2(
      (points * Math.max(0, correctPicked - wrongPicked)) / correctIds.size,
    );
  }

  // FILL_BLANK
  if (question.blanks.length === 0) return 0;
  const given = new Map(
    answer.blankAnswers.map((b) => [b.blankId, normalizeBlankAnswer(b.value)]),
  );
  const matched = question.blanks.filter((blank) => {
    const value = given.get(blank.id);
    if (!value) return false;
    return blank.acceptedAnswers.some((a) => normalizeBlankAnswer(a) === value);
  }).length;
  if (mode === 'ALL_OR_NOTHING') {
    return matched === question.blanks.length ? points : 0;
  }
  return round2((points * matched) / question.blanks.length);
}

export function sumScores(scores: number[]): number {
  return round2(scores.reduce((total, s) => total + s, 0));
}

export function validateAnswerShape(
  question: GradableQuestion,
  answer: QuizAnswerInput,
): string | null {
  const optionIds = new Set(question.options.map((o) => o.id));
  const blankIds = new Set(question.blanks.map((b) => b.id));

  if (question.type === 'FILL_BLANK') {
    if (answer.selectedOptionIds.length > 0) {
      return 'Fill-in-the-blank answers take no options';
    }
    const seen = new Set<string>();
    for (const b of answer.blankAnswers) {
      if (!blankIds.has(b.blankId)) return `Unknown blank ${b.blankId}`;
      if (seen.has(b.blankId)) return `Duplicate blank ${b.blankId}`;
      seen.add(b.blankId);
    }
    return null;
  }

  if (answer.blankAnswers.length > 0) {
    return 'Choice answers take no blanks';
  }
  if (question.type === 'SINGLE' && answer.selectedOptionIds.length > 1) {
    return 'Single-answer questions accept one option';
  }
  const seen = new Set<string>();
  for (const id of answer.selectedOptionIds) {
    if (!optionIds.has(id)) return `Unknown option ${id}`;
    if (seen.has(id)) return `Duplicate option ${id}`;
    seen.add(id);
  }
  return null;
}
