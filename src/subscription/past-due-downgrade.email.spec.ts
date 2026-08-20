import { buildPastDueDowngradeEmail } from './past-due-downgrade.email';

const base = {
  schoolTitle: 'โรงเรียนทดสอบ',
  plan: 'PREMIUM',
  billingUrl: 'https://app.tatugaschool.com/school/abc?menu=Subscription',
};

describe('buildPastDueDowngradeEmail', () => {
  it('th: subject and body are Thai and mention the school', () => {
    const { subject, html } = buildPastDueDowngradeEmail({
      ...base,
      language: 'th',
    });
    expect(subject).toContain('โรงเรียนทดสอบ');
    expect(subject).toContain('ถูกปรับเป็นแผนฟรี');
    expect(html).toContain('แพ็กเกจ PREMIUM ของโรงเรียน โรงเรียนทดสอบ');
    expect(html).toContain(base.billingUrl);
    expect(html).not.toContain('was switched to the Free plan');
  });

  it('en: subject and body are English and mention the school', () => {
    const { subject, html } = buildPastDueDowngradeEmail({
      ...base,
      language: 'en',
    });
    expect(subject).toContain('โรงเรียนทดสอบ');
    expect(subject).toContain('switched to the Free plan');
    expect(html).toContain('The PREMIUM plan for โรงเรียนทดสอบ');
    expect(html).toContain(base.billingUrl);
    expect(html).not.toContain('ถูกปรับเป็นแผนฟรี');
  });

  it('keeps the address footer in both languages', () => {
    for (const language of ['en', 'th'] as const) {
      const { html } = buildPastDueDowngradeEmail({ ...base, language });
      expect(html).toContain('ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์');
      expect(html).toContain('banner-tatugaschool.jpg');
    }
  });
});
