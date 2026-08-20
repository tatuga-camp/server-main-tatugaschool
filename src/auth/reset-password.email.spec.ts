import { buildResetPasswordEmail } from './reset-password.email';

const base = {
  firstName: 'Perm',
  lastName: 'Lap',
  resetUrl: 'https://app.tatugaschool.com/auth/reset-password?token=abc',
  expiresAt: new Date('2026-08-20T10:05:00Z'),
};

describe('buildResetPasswordEmail', () => {
  it('en: English subject, greeting, and reset link', () => {
    const { subject, html } = buildResetPasswordEmail({
      ...base,
      language: 'en',
    });
    expect(subject).toBe('Reset your password');
    expect(html).toContain('Hello Perm Lap');
    expect(html).toContain(base.resetUrl);
    expect(html).not.toContain('รีเซ็ตรหัสผ่าน');
  });

  it('th: Thai subject, greeting, and reset link', () => {
    const { subject, html } = buildResetPasswordEmail({
      ...base,
      language: 'th',
    });
    expect(subject).toBe('รีเซ็ตรหัสผ่านของคุณ');
    expect(html).toContain('สวัสดีคุณ Perm Lap');
    expect(html).toContain(base.resetUrl);
    expect(html).not.toContain('Hello Perm Lap');
  });

  it('keeps the address footer in both languages', () => {
    for (const language of ['en', 'th'] as const) {
      const { html } = buildResetPasswordEmail({ ...base, language });
      expect(html).toContain('ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์');
    }
  });
});
