import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateIssueReportDto } from './create-issue-report.dto';

const valid = {
  errorName: 'TypeError',
  message: 'boom',
  stack: 'TypeError: boom\n    at X (a.js:1:1)',
  componentStack: '\n    at Page',
  pageUrl: 'http://localhost:8181/subject/1',
  userAgent: 'Mozilla/5.0',
  capturedAt: '2026-09-24T10:00:00.000Z',
};

describe('CreateIssueReportDto', () => {
  it('accepts a valid body', async () => {
    const errors = await validate(plainToInstance(CreateIssueReportDto, valid));
    expect(errors).toHaveLength(0);
  });

  it('rejects a stack above 20000 characters', async () => {
    const errors = await validate(
      plainToInstance(CreateIssueReportDto, {
        ...valid,
        stack: 'x'.repeat(20001),
      }),
    );
    expect(errors.map((e) => e.property)).toEqual(['stack']);
  });

  it('rejects an empty error name and a bad date', async () => {
    const errors = await validate(
      plainToInstance(CreateIssueReportDto, {
        ...valid,
        errorName: '',
        capturedAt: 'yesterday',
      }),
    );
    expect(errors.map((e) => e.property).sort()).toEqual([
      'capturedAt',
      'errorName',
    ]);
  });
});
