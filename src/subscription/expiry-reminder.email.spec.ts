import { buildExpiryReminderEmail } from './expiry-reminder.email';

describe('buildExpiryReminderEmail', () => {
  const base = {
    schoolTitle: 'Tatuga Academy',
    plan: 'PREMIUM',
    expireAt: new Date('2026-08-29T12:00:00.000Z'),
    renewUrl: 'https://app.tatugaschool.com/school/abc123?menu=Subscription',
  };

  it('uses plural wording for multiple days', () => {
    const { subject, html } = buildExpiryReminderEmail({ ...base, daysLeft: 10 });
    expect(subject).toBe(
      'Your Tatuga School subscription expires in 10 days',
    );
    expect(html).toContain('10 days');
    expect(html).toContain('Tatuga Academy');
    expect(html).toContain(base.renewUrl);
  });

  it('uses singular wording for 1 day', () => {
    const { subject } = buildExpiryReminderEmail({ ...base, daysLeft: 1 });
    expect(subject).toBe('Your Tatuga School subscription expires in 1 day');
  });

  it('includes the plan name and expiry date', () => {
    const { html } = buildExpiryReminderEmail({ ...base, daysLeft: 3 });
    expect(html).toContain('PREMIUM');
    expect(html).toContain('29');
  });
});
