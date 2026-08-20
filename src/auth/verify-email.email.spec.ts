import { buildVerifyEmail } from './verify-email.email';

const base = {
  firstName: 'Perm',
  verifyUrl: 'https://app.tatugaschool.com/auth/verify-email?token=abc',
};

describe('buildVerifyEmail', () => {
  it('en: English subject, greeting, and verify link', () => {
    const { subject, html } = buildVerifyEmail({ ...base, language: 'en' });
    expect(subject).toBe('Verify your email to login on Tatuga School');
    expect(html).toContain('Hello Perm');
    expect(html).toContain(base.verifyUrl);
    expect(html).not.toContain('ยืนยันอีเมล');
  });

  it('th: Thai subject, greeting, and verify link', () => {
    const { subject, html } = buildVerifyEmail({ ...base, language: 'th' });
    expect(subject).toBe('ยืนยันอีเมลเพื่อเข้าสู่ระบบ Tatuga School');
    expect(html).toContain('สวัสดีคุณ Perm');
    expect(html).toContain(base.verifyUrl);
    expect(html).not.toContain('Hello Perm');
  });

  it('keeps the address footer in both languages', () => {
    for (const language of ['en', 'th'] as const) {
      const { html } = buildVerifyEmail({ ...base, language });
      expect(html).toContain('ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์');
    }
  });
});
