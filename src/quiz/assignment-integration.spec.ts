import { isGradedAssignmentType } from './quiz-settings';

describe('isGradedAssignmentType', () => {
  it('counts Assignment, VideoQuiz and Quiz but not Material', () => {
    expect(isGradedAssignmentType('Assignment')).toBe(true);
    expect(isGradedAssignmentType('VideoQuiz')).toBe(true);
    expect(isGradedAssignmentType('Quiz')).toBe(true);
    expect(isGradedAssignmentType('Material')).toBe(false);
  });
});
