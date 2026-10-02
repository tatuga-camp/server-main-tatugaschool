import { createPrismaStub } from '../testing/prisma-stub';
import { createPassthroughCache } from '../testing/cache-test-utils';
import { subjectScope } from '../cache-scopes';
import { WordCloudSetRepository } from '../../word-cloud-set/word-cloud-set.repository';
import { WordCloudRepository } from '../../word-cloud/word-cloud.repository';

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
const W = subjectScope('s1', 'wordcloud');

// The shared stub resolves findRaw to a single record; deleteSet maps over
// findRaw's array result, so serve it an empty question list.
function withFindRawList(p: any): any {
  return new Proxy(p, {
    get: (target, prop: string) => {
      const value = target[prop];
      if (prop !== 'wordCloud') return value;
      return new Proxy(value, {
        get: (m, op: string) =>
          op === 'findRaw' ? jest.fn(async () => []) : m[op],
      });
    },
  });
}

type Case = {
  name: string;
  run: (cache: any, prisma: any) => Promise<unknown>;
  scopes: string[];
};

const cases: Case[] = [
  {
    name: 'Set.create',
    run: (c, p) => new WordCloudSetRepository(p, c).create({ data: {} as any }),
    scopes: [W],
  },
  {
    name: 'Set.update',
    run: (c, p) =>
      new WordCloudSetRepository(p, c).update({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [W],
  },
  {
    name: 'Set.updateQuestionsBySetId',
    run: (c, p) =>
      new WordCloudSetRepository(p, c).updateQuestionsBySetId('set1', 's1', {
        status: 'OPEN',
      } as any),
    scopes: [W],
  },
  {
    name: 'Set.createQuestion',
    run: (c, p) =>
      new WordCloudSetRepository(p, c).createQuestion({ data: {} as any }),
    scopes: [W],
  },
  {
    name: 'Set.updateQuestion',
    run: (c, p) =>
      new WordCloudSetRepository(p, c).updateQuestion({
        where: { id: 'r1' },
        data: {},
      }),
    scopes: [W],
  },
  {
    name: 'Set.deleteSet',
    run: (c, p) =>
      new WordCloudSetRepository(withFindRawList(p), c).deleteSet('set1'),
    scopes: [W],
  },
  {
    name: 'Set.deleteQuestion',
    run: (c, p) => new WordCloudSetRepository(p, c).deleteQuestion('q1'),
    scopes: [W],
  },
  {
    name: 'WordCloud.create',
    run: (c, p) => new WordCloudRepository(p, c).create({ data: {} as any }),
    scopes: [W],
  },
  {
    name: 'WordCloud.update',
    run: (c, p) =>
      new WordCloudRepository(p, c).update({ where: { id: 'r1' }, data: {} }),
    scopes: [W],
  },
  {
    name: 'WordCloud.delete',
    run: (c, p) => new WordCloudRepository(p, c).delete({ wordCloudId: 'r1' }),
    scopes: [W],
  },
  {
    name: 'WordCloud.createAnswer',
    run: (c, p) =>
      new WordCloudRepository(p, c).createAnswer({ data: {} as any }),
    scopes: [W],
  },
];

describe('word-cloud-scope repositories bump after writes', () => {
  it.each(cases)('$name', async ({ run, scopes }) => {
    const cache = createPassthroughCache();
    await run(cache, createPrismaStub(record));
    for (const scope of scopes) expect(cache.bump).toHaveBeenCalledWith(scope);
  });
});
