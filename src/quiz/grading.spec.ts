
import {
  GradableQuestion,
  gradeQuestion,
  normalizeBlankAnswer,
  sumScores,
  validateAnswerShape,
} from './grading';

const opt = (id: string, isCorrect: boolean) => ({
  id,
  text: id.toUpperCase(),
  imageUrl: null,
  isCorrect,
});
const single: GradableQuestion = {
  type: 'SINGLE',
  points: 2,
  options: [opt('a', false), opt('b', true)],
  blanks: [],
};
const multiple: GradableQuestion = {
  type: 'MULTIPLE',
  points: 4,
  options: [opt('a', true), opt('b', false), opt('c', true), opt('d', false)],
  blanks: [],
};
const fill: GradableQuestion = {
  type: 'FILL_BLANK',
  points: 2,
  options: [],
  blanks: [
    { id: 'x', acceptedAnswers: ['Bangkok', 'กรุงเทพ'] },
    { id: 'y', acceptedAnswers: ['Thailand'] },
  ],
};
const pick = (...ids: string[]) => ({ selectedOptionIds: ids, blankAnswers: [] });
const blanks = (x?: string, y?: string) => ({
  selectedOptionIds: [],
  blankAnswers: [
    ...(x === undefined ? [] : [{ blankId: 'x', value: x }]),
    ...(y === undefined ? [] : [{ blankId: 'y', value: y }]),
  ],
});

describe('normalizeBlankAnswer', () => {
  it('trims, collapses whitespace and lowercases', () => {
    expect(normalizeBlankAnswer('  Bangkok   City ')).toBe('bangkok city');
  });
  it('treats a below-vowel typed after the tone mark as equal (NFC case)', () => {
    // ปู่: ป + ู + ่  vs  ป + ่ + ู
    expect(normalizeBlankAnswer('ปู่')).toBe(
      normalizeBlankAnswer('ปู่'),
    );
  });
  it('treats an above-vowel typed after the tone mark as equal (NFC does not fix this)', () => {
    // กิ่ง: ก + ิ + ่ + ง  vs  ก + ่ + ิ + ง
    expect(normalizeBlankAnswer('ก่ิง')).toBe(
      normalizeBlankAnswer('กิ่ง'),
    );
  });
  it('treats SARA AM typed before the tone mark as equal', () => {
    // น้ำ: น + ้ + ำ  vs  น + ำ + ้
    expect(normalizeBlankAnswer('นำ้')).toBe(
      normalizeBlankAnswer('น้ำ'),
    );
  });
});

describe('gradeQuestion SINGLE', () => {
  it('gives full points for the correct option', () => {
    expect(gradeQuestion(single, pick('b'), 'ALL_OR_NOTHING')).toBe(2);
  });
  it('gives 0 for a wrong option, two options, nothing, or no answer', () => {
    expect(gradeQuestion(single, pick('a'), 'PARTIAL')).toBe(0);
    expect(gradeQuestion(single, pick('a', 'b'), 'PARTIAL')).toBe(0);
    expect(gradeQuestion(single, pick(), 'PARTIAL')).toBe(0);
    expect(gradeQuestion(single, null, 'PARTIAL')).toBe(0);
  });
});

describe('gradeQuestion MULTIPLE', () => {
  it('exact set gives full points in both modes', () => {
    expect(gradeQuestion(multiple, pick('c', 'a'), 'ALL_OR_NOTHING')).toBe(4);
    expect(gradeQuestion(multiple, pick('a', 'c'), 'PARTIAL')).toBe(4);
  });
  it('ALL_OR_NOTHING gives 0 for a partial set', () => {
    expect(gradeQuestion(multiple, pick('a'), 'ALL_OR_NOTHING')).toBe(0);
  });
  it('PARTIAL = points × max(0, correct − wrong) / totalCorrect', () => {
    expect(gradeQuestion(multiple, pick('a'), 'PARTIAL')).toBe(2);
    expect(gradeQuestion(multiple, pick('a', 'b'), 'PARTIAL')).toBe(0);
    expect(gradeQuestion(multiple, pick('a', 'b', 'c'), 'PARTIAL')).toBe(2);
    expect(gradeQuestion(multiple, pick('b', 'd'), 'PARTIAL')).toBe(0);
  });
  it('ignores unknown option ids', () => {
    expect(gradeQuestion(multiple, pick('a', 'c', 'zzz'), 'ALL_OR_NOTHING')).toBe(4);
  });
});

describe('gradeQuestion FILL_BLANK', () => {
  it('all blanks right gives full points', () => {
    expect(gradeQuestion(fill, blanks(' bangKOK ', 'Thailand'), 'ALL_OR_NOTHING')).toBe(2);
    expect(gradeQuestion(fill, blanks('กรุงเทพ', 'thailand'), 'ALL_OR_NOTHING')).toBe(2);
  });
  it('one of two blanks: AON 0, PARTIAL half', () => {
    expect(gradeQuestion(fill, blanks('Bangkok', 'Laos'), 'ALL_OR_NOTHING')).toBe(0);
    expect(gradeQuestion(fill, blanks('Bangkok', 'Laos'), 'PARTIAL')).toBe(1);
  });
  it('empty or missing blanks never match', () => {
    expect(gradeQuestion(fill, blanks('', ''), 'PARTIAL')).toBe(0);
    expect(gradeQuestion(fill, blanks(), 'PARTIAL')).toBe(0);
  });
});

describe('sumScores', () => {
  it('sums and rounds to 2 decimals', () => {
    expect(sumScores([1.25, 2.5, 0])).toBe(3.75);
    expect(sumScores([1 / 3, 1 / 3])).toBe(0.67);
    expect(sumScores([])).toBe(0);
  });
});

describe('validateAnswerShape', () => {
  it('accepts valid answers', () => {
    expect(validateAnswerShape(single, pick('a'))).toBeNull();
    expect(validateAnswerShape(single, pick())).toBeNull();
    expect(validateAnswerShape(multiple, pick('a', 'b'))).toBeNull();
    expect(validateAnswerShape(fill, blanks('x', 'y'))).toBeNull();
  });
  it('rejects bad shapes', () => {
    expect(validateAnswerShape(single, pick('a', 'b'))).toMatch(/one option/);
    expect(validateAnswerShape(single, pick('zzz'))).toMatch(/Unknown option/);
    expect(validateAnswerShape(multiple, pick('a', 'a'))).toMatch(/Duplicate/);
    expect(validateAnswerShape(fill, pick('a'))).toMatch(/no options/);
    expect(
      validateAnswerShape(fill, {
        selectedOptionIds: [],
        blankAnswers: [{ blankId: 'nope', value: 'v' }],
      }),
    ).toMatch(/Unknown blank/);
    expect(validateAnswerShape(single, blanks('x'))).toMatch(/no blanks/);
  });
});
