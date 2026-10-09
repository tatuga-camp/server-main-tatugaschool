import { AssignmentOnQuiz } from '@prisma/client';
import { withDefaultQuizSettings } from './quiz-settings';
import { isAnswered, orderForStudent, toStudentQuestion, toStudentResultQuestion } from './student-question.mapper';

const question = (id: string, order: number, overrides: Partial<AssignmentOnQuiz> = {}): AssignmentOnQuiz => ({
  id,
  createAt: new Date(),
  updateAt: new Date(),
  order,
  type: 'SINGLE',
  prompt: `Prompt ${id}`,
  imageUrl: null,
  points: 1,
  options: [
    { id: `${id}-a`, text: 'A', imageUrl: null, isCorrect: true },
    { id: `${id}-b`, text: 'B', imageUrl: null, isCorrect: false },
    { id: `${id}-c`, text: 'C', imageUrl: null, isCorrect: false },
  ],
  blanks: [],
  assignmentId: 'asg',
  subjectId: 'sub',
  schoolId: 'sch',
  ...overrides,
});
const fillQ = question('f', 9, {
  type: 'FILL_BLANK',
  prompt: 'Capital {{x}}',
  options: [],
  blanks: [{ id: 'x', acceptedAnswers: ['Bangkok'] }],
});

describe('toStudentQuestion', () => {
  it('never includes the answer key (deep key scan)', () => {
    const json = JSON.stringify([toStudentQuestion(question('q1', 0)), toStudentQuestion(fillQ)]);
    expect(json).not.toContain('isCorrect');
    expect(json).not.toContain('acceptedAnswers');
    expect(json).not.toContain('Bangkok');
  });
  it('keeps ids, prompt and blank ids', () => {
    expect(toStudentQuestion(fillQ)).toEqual({
      id: 'f',
      order: 9,
      type: 'FILL_BLANK',
      prompt: 'Capital {{x}}',
      imageUrl: null,
      points: 1,
      options: [],
      blanks: [{ id: 'x' }],
    });
  });
});

describe('orderForStudent', () => {
  const qs = [question('q3', 2), question('q1', 0), question('q2', 1)];
  it('sorts by order when shuffle is off', () => {
    const out = orderForStudent(qs, withDefaultQuizSettings(null), 5);
    expect(out.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    expect(out[0].options.map((o) => o.id)).toEqual(['q1-a', 'q1-b', 'q1-c']);
  });
  it('is stable for one seed when shuffling questions and options', () => {
    const settings = withDefaultQuizSettings({ shuffleQuestions: true, shuffleOptions: true });
    expect(orderForStudent(qs, settings, 11)).toEqual(orderForStudent(qs, settings, 11));
  });
});

describe('toStudentResultQuestion', () => {
  it('includes the key and score after submit', () => {
    const r = toStudentResultQuestion(fillQ, 1);
    expect(r.correctOptionIds).toEqual([]);
    expect(r.acceptedAnswers).toEqual([{ blankId: 'x', answers: ['Bangkok'] }]);
    expect(r.score).toBe(1);
    expect(toStudentResultQuestion(question('q1', 0), 0).correctOptionIds).toEqual(['q1-a']);
  });
});

describe('isAnswered', () => {
  it('is true only when something was chosen or typed', () => {
    expect(isAnswered({ selectedOptionIds: [], blankAnswers: [] })).toBe(false);
    expect(isAnswered({ selectedOptionIds: [], blankAnswers: [{ value: '  ' }] })).toBe(false);
    expect(isAnswered({ selectedOptionIds: ['a'], blankAnswers: [] })).toBe(true);
    expect(isAnswered({ selectedOptionIds: [], blankAnswers: [{ value: 'x' }] })).toBe(true);
  });
});
