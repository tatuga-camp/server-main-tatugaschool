import { buildExpiryReminderEmail } from './expiry-reminder.email';

const base = {
  schoolTitle: 'Tatuga Test School',
  plan: 'PREMIUM',
  expireAt: new Date('2026-09-01T00:00:00Z'),
  renewUrl: 'https://app.tatugaschool.com/school/abc?menu=Subscription',
};

describe('buildExpiryReminderEmail', () => {
  it('en: subject states the days remaining', () => {
    const { subject, html } = buildExpiryReminderEmail({
      ...base,
      daysLeft: 10,
      language: 'en',
    });
    expect(subject).toBe(
      'Your Tatuga School subscription expires in 10 days',
    );
    expect(html).toContain('The PREMIUM subscription for Tatuga Test School');
    expect(html).toContain(base.renewUrl);
    expect(html).not.toContain('จะหมดอายุ');
  });

  it('en: uses singular "day" for 1 day left', () => {
    const { subject } = buildExpiryReminderEmail({
      ...base,
      daysLeft: 1,
      language: 'en',
    });
    expect(subject).toBe('Your Tatuga School subscription expires in 1 day');
  });

  it('th: subject and body are Thai', () => {
    const { subject, html } = buildExpiryReminderEmail({
      ...base,
      daysLeft: 3,
      language: 'th',
    });
    expect(subject).toBe(
      'แพ็กเกจ Tatuga School ของคุณจะหมดอายุในอีก 3 วัน',
    );
    expect(html).toContain('แพ็กเกจ PREMIUM ของโรงเรียน Tatuga Test School');
    expect(html).toContain('ต่ออายุตอนนี้');
    expect(html).toContain(base.renewUrl);
    expect(html).not.toContain('Renew now');
  });

  it('keeps the address footer in both languages', () => {
    for (const language of ['en', 'th'] as const) {
      const { html } = buildExpiryReminderEmail({
        ...base,
        daysLeft: 3,
        language,
      });
      expect(html).toContain('ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์');
    }
  });
});
