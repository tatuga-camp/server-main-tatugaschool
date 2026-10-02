import { findGuardOffenders } from './cache-guard';
import { subjectIdsOf } from '../cache-scopes';

describe('findGuardOffenders', () => {
  it('flags a repository that writes a cached model without bumping', () => {
    const offenders = findGuardOffenders(
      [
        {
          rel: 'x/x.repository.ts',
          source: 'await this.prisma.assignment.update({})',
        },
      ],
      {},
    );
    expect(offenders).toEqual([
      'x/x.repository.ts: writes cached models without cache.bump',
    ]);
  });

  it('accepts a repository that writes a cached model and bumps', () => {
    const source =
      'await this.prisma.assignment.update({}); await this.cache.bump(s);';
    expect(
      findGuardOffenders([{ rel: 'x/x.repository.ts', source }], {}),
    ).toEqual([]);
  });

  it('flags a raw update of a cached collection in a repository without bumping', () => {
    const source =
      "await this.prisma.$runCommandRaw({ update: 'CommentOnAssignment', updates: [] })";
    expect(
      findGuardOffenders([{ rel: 'x/x.repository.ts', source }], {}),
    ).toEqual(['x/x.repository.ts: writes cached models without cache.bump']);
  });

  it('ignores raw writes to uncached collections', () => {
    const source =
      "await this.prisma.$runCommandRaw({ update: 'Notification', updates: [] })";
    expect(
      findGuardOffenders([{ rel: 'x/x.repository.ts', source }], {}),
    ).toEqual([]);
  });

  it('flags a non-allow-listed direct write in a service, typed and raw', () => {
    const source =
      "await this.prisma.subject.update({}); await this.prisma.$runCommandRaw({ update: 'MemberOnSchool' })";
    expect(findGuardOffenders([{ rel: 'x/x.service.ts', source }], {})).toEqual(
      ['x/x.service.ts:subject.update', 'x/x.service.ts:raw.MemberOnSchool'],
    );
  });

  it('accepts an allow-listed service write', () => {
    expect(
      findGuardOffenders(
        [
          {
            rel: 'x/x.service.ts',
            source: 'await tx.studentOnAssignment.update({})',
          },
        ],
        { 'x/x.service.ts:studentOnAssignment.update': 'bumps after tx' },
      ),
    ).toEqual([]);
  });
});

describe('subjectIdsOf', () => {
  it('returns unique subject ids from a batch, single item, or empty data', () => {
    expect(
      subjectIdsOf([
        { subjectId: 'a' },
        { subjectId: 'b' },
        { subjectId: 'a' },
      ]),
    ).toEqual(['a', 'b']);
    expect(subjectIdsOf({ subjectId: 'a' })).toEqual(['a']);
    expect(subjectIdsOf([])).toEqual([]);
    expect(subjectIdsOf(undefined)).toEqual([]);
  });
});
