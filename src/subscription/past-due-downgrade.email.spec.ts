import { buildPastDueDowngradeEmail } from './past-due-downgrade.email';

describe('buildPastDueDowngradeEmail', () => {
  const base = {
    schoolTitle: 'Tatuga Academy',
    plan: 'PREMIUM',
    billingUrl: 'https://app.tatugaschool.com/school/abc123?menu=Subscription',
  };

  it('uses a Thai subject naming the school', () => {
    const { subject } = buildPastDueDowngradeEmail(base);
    expect(subject).toBe(
      'แพ็กเกจของโรงเรียน Tatuga Academy ถูกปรับเป็นแผนฟรีเนื่องจากค้างชำระ',
    );
  });

  it('includes the plan, school title, and billing link in the html', () => {
    const { html } = buildPastDueDowngradeEmail(base);
    expect(html).toContain('PREMIUM');
    expect(html).toContain('Tatuga Academy');
    expect(html).toContain(base.billingUrl);
  });

  it('explains recovery by paying the outstanding invoice', () => {
    const { html } = buildPastDueDowngradeEmail(base);
    expect(html).toContain('ชำระใบแจ้งหนี้ที่ค้างอยู่');
  });
});
