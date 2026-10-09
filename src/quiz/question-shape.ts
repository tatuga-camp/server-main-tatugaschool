import { QuizBlank, QuizOption, QuizQuestionType } from '@prisma/client';
import { BLANK_TOKEN_SOURCE, QUIZ_ID_PATTERN } from './quiz.constants';

export type QuestionShapeInput = {
  type: QuizQuestionType;
  prompt: string;
  options: {
    id: string;
    text: string;
    imageUrl?: string | null;
    isCorrect: boolean;
  }[];
  blanks: { id: string; acceptedAnswers: string[] }[];
};

export function validateQuestionShape(
  input: QuestionShapeInput,
): string | null {
  if (!input.prompt.trim()) return 'Prompt is required';

  if (input.type === 'FILL_BLANK') {
    if (input.options.length > 0)
      return 'Fill-in-the-blank questions cannot have options';
    if (input.blanks.length === 0)
      return 'Fill-in-the-blank questions need at least one blank';
    const ids = new Set<string>();
    for (const blank of input.blanks) {
      if (!QUIZ_ID_PATTERN.test(blank.id))
        return `Invalid blank id ${blank.id}`;
      if (ids.has(blank.id)) return `Duplicate blank id ${blank.id}`;
      ids.add(blank.id);
      if (!blank.acceptedAnswers.some((a) => a.trim().length > 0)) {
        return `Blank ${blank.id} needs at least one accepted answer`;
      }
    }
    const tokens = new Set(
      [...input.prompt.matchAll(new RegExp(BLANK_TOKEN_SOURCE, 'g'))].map(
        (m) => m[1],
      ),
    );
    for (const id of ids) {
      if (!tokens.has(id)) return `Blank ${id} is missing from the prompt`;
    }
    for (const token of tokens) {
      if (!ids.has(token)) return `Prompt token ${token} has no matching blank`;
    }
    return null;
  }

  if (input.blanks.length > 0) return 'Choice questions cannot have blanks';
  if (input.options.length < 2)
    return 'Choice questions need at least 2 options';
  const ids = new Set<string>();
  for (const option of input.options) {
    if (!QUIZ_ID_PATTERN.test(option.id))
      return `Invalid option id ${option.id}`;
    if (ids.has(option.id)) return `Duplicate option id ${option.id}`;
    ids.add(option.id);
    if (!option.text.trim() && !option.imageUrl)
      return 'Option text or image is required';
  }
  const correct = input.options.filter((o) => o.isCorrect).length;
  if (input.type === 'SINGLE' && correct !== 1) {
    return 'Single-answer questions need exactly one correct option';
  }
  if (input.type === 'MULTIPLE' && correct < 1) {
    return 'Multiple-answer questions need at least one correct option';
  }
  return null;
}

export function toQuizOption(option: {
  id: string;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
}): QuizOption {
  return {
    id: option.id,
    text: option.text.trim(),
    imageUrl: option.imageUrl ?? null,
    isCorrect: option.isCorrect,
  };
}

export function toQuizBlank(blank: {
  id: string;
  acceptedAnswers: string[];
}): QuizBlank {
  return {
    id: blank.id,
    acceptedAnswers: blank.acceptedAnswers.map((a) => a.trim()).filter(Boolean),
  };
}
