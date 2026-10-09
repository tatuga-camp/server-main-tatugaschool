import {
  QuestionShapeInput,
  toQuizBlank,
  toQuizOption,
  validateQuestionShape,
} from './question-shape';

const o = (id: string, isCorrect: boolean, text = id) => ({
  id,
  text,
  isCorrect,
});

describe('validateQuestionShape', () => {
  it('accepts valid questions of each type', () => {
    expect(
      validateQuestionShape({
        type: 'SINGLE',
        prompt: 'Q',
        options: [o('a', true), o('b', false)],
        blanks: [],
      }),
    ).toBeNull();
    expect(
      validateQuestionShape({
        type: 'MULTIPLE',
        prompt: 'Q',
        options: [o('a', true), o('b', true)],
        blanks: [],
      }),
    ).toBeNull();
    expect(
      validateQuestionShape({
        type: 'FILL_BLANK',
        prompt: 'Capital of {{x1}} is {{y_2}}',
        options: [],
        blanks: [
          { id: 'x1', acceptedAnswers: ['Thailand'] },
          { id: 'y_2', acceptedAnswers: ['Bangkok', 'กรุงเทพ'] },
        ],
      }),
    ).toBeNull();
  });

  const bad: [string, QuestionShapeInput, RegExp][] = [
    [
      'SINGLE with two correct',
      {
        type: 'SINGLE',
        prompt: 'Q',
        options: [o('a', true), o('b', true)],
        blanks: [],
      },
      /exactly one correct/,
    ],
    [
      'SINGLE with one option',
      { type: 'SINGLE', prompt: 'Q', options: [o('a', true)], blanks: [] },
      /at least 2 options/,
    ],
    [
      'MULTIPLE with no correct',
      {
        type: 'MULTIPLE',
        prompt: 'Q',
        options: [o('a', false), o('b', false)],
        blanks: [],
      },
      /at least one correct/,
    ],
    [
      'duplicate option ids',
      {
        type: 'MULTIPLE',
        prompt: 'Q',
        options: [o('a', true), o('a', false)],
        blanks: [],
      },
      /Duplicate option id/,
    ],
    [
      'bad option id',
      {
        type: 'SINGLE',
        prompt: 'Q',
        options: [o('a b', true), o('c', false)],
        blanks: [],
      },
      /Invalid option id/,
    ],
    [
      'empty option text without image',
      {
        type: 'SINGLE',
        prompt: 'Q',
        options: [o('a', true, '  '), o('b', false)],
        blanks: [],
      },
      /Option text/,
    ],
    [
      'choice question with blanks',
      {
        type: 'SINGLE',
        prompt: 'Q',
        options: [o('a', true), o('b', false)],
        blanks: [{ id: 'x', acceptedAnswers: ['y'] }],
      },
      /cannot have blanks/,
    ],
    [
      'FILL_BLANK with options',
      {
        type: 'FILL_BLANK',
        prompt: '{{x}}',
        options: [o('a', true)],
        blanks: [{ id: 'x', acceptedAnswers: ['y'] }],
      },
      /cannot have options/,
    ],
    [
      'FILL_BLANK with no blanks',
      { type: 'FILL_BLANK', prompt: 'none', options: [], blanks: [] },
      /at least one blank/,
    ],
    [
      'blank missing from prompt',
      {
        type: 'FILL_BLANK',
        prompt: 'no token',
        options: [],
        blanks: [{ id: 'x', acceptedAnswers: ['y'] }],
      },
      /missing from the prompt/,
    ],
    [
      'prompt token without blank',
      {
        type: 'FILL_BLANK',
        prompt: '{{x}} {{z}}',
        options: [],
        blanks: [{ id: 'x', acceptedAnswers: ['y'] }],
      },
      /no matching blank/,
    ],
    [
      'blank with only empty answers',
      {
        type: 'FILL_BLANK',
        prompt: '{{x}}',
        options: [],
        blanks: [{ id: 'x', acceptedAnswers: [' '] }],
      },
      /accepted answer/,
    ],
    [
      'empty prompt',
      {
        type: 'SINGLE',
        prompt: '   ',
        options: [o('a', true), o('b', false)],
        blanks: [],
      },
      /Prompt/,
    ],
  ];
  it.each(bad)('rejects %s', (_name, input, message) => {
    expect(validateQuestionShape(input)).toMatch(message);
  });
});

describe('toQuizOption / toQuizBlank', () => {
  it('trims and fills nulls', () => {
    expect(toQuizOption({ id: 'a', text: ' A ', isCorrect: true })).toEqual({
      id: 'a',
      text: 'A',
      imageUrl: null,
      isCorrect: true,
    });
    expect(
      toQuizBlank({ id: 'x', acceptedAnswers: [' Bangkok ', '', ' '] }),
    ).toEqual({ id: 'x', acceptedAnswers: ['Bangkok'] });
  });
});
