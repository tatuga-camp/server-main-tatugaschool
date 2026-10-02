import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import { subjectScope } from '../cache-scopes';
import { ScoreOnSubjectRepository } from '../../score-on-subject/score-on-subject.repository';
import { ScoreOnStudentRepository } from '../../score-on-student/score-on-student.repository';
import { GradeRepository } from '../../grade/grade.repository';

const record = {
  id: 'r1',
  subjectId: 's1',
  schoolId: 'sch1',
  assignmentId: 'a1',
  attendanceTableId: 't1',
  studentOnAssignmentId: 'soa1',
  title: 'x',
  contentType: 'TEXT',
  body: '',
};
const G = subjectScope('s1', 'grades');

type Case = {
  name: string;
  run: (cache: any, prisma: any) => Promise<unknown>;
  scopes: string[];
};

const cases: Case[] = [
  {
    name: 'ScoreOnSubject.create',
    run: (c, p) =>
      new ScoreOnSubjectRepository(p, c).createSocreOnSubject({} as any),
    scopes: [G],
  },
  {
    name: 'ScoreOnSubject.update',
    run: (c, p) =>
      new ScoreOnSubjectRepository(p, c).updateScoreOnSubject({
        query: { scoreOnSubjectId: 'r1' },
        body: {},
      }),
    scopes: [G],
  },
  {
    name: 'ScoreOnSubject.delete',
    run: (c, p) =>
      new ScoreOnSubjectRepository(p, c).delete({ scoreOnSubjectId: 'r1' }),
    scopes: [G],
  },
  {
    name: 'ScoreOnStudent.create',
    run: (c, p) =>
      new ScoreOnStudentRepository(p, c).createSocreOnStudent({} as any),
    scopes: [G],
  },
  {
    name: 'ScoreOnStudent.update',
    run: (c, p) =>
      new ScoreOnStudentRepository(p, c).updateScoreOnStudent({
        query: { scoreOnStudentId: 'r1' },
        body: {},
      } as any),
    scopes: [G],
  },
  {
    name: 'ScoreOnStudent.delete',
    run: (c, p) =>
      new ScoreOnStudentRepository(p, c).deleteScoreOnStudent({
        scoreOnStudentId: 'r1',
      }),
    scopes: [G],
  },
  {
    name: 'Grade.create',
    run: (c, p) => new GradeRepository(p, c).create({ data: {} as any }),
    scopes: [G],
  },
  {
    name: 'Grade.update',
    run: (c, p) =>
      new GradeRepository(p, c).update({ where: { id: 'r1' }, data: {} }),
    scopes: [G],
  },
  {
    name: 'Grade.delete',
    run: (c, p) => new GradeRepository(p, c).delete({ where: { id: 'r1' } }),
    scopes: [G],
  },
];

describe('grades-scope repositories bump after writes', () => {
  it.each(cases)('$name', async ({ run, scopes }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record));
    for (const scope of scopes) expect(cache.bump).toHaveBeenCalledWith(scope);
  });
});

describe('no bump when the write throws', () => {
  it.each(cases)('$name', async ({ run }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record, { failWrites: true })).catch(
      () => undefined,
    );
    expect(cache.bump).not.toHaveBeenCalled();
  });
});
