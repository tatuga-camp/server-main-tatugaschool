import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { verifySanityWebhookSignature } from './sanity-signature';

const SECRET = 'test-secret';

function signature(timestamp: number, body: string, secret = SECRET): string {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('base64url');
  return `t=${timestamp},v1=${hmac}`;
}

describe('verifySanityWebhookSignature', () => {
  const now = Date.parse('2026-05-23T12:00:00Z');
  const rawBody = Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8');

  it('accepts a valid signature within the tolerance window', () => {
    const header = signature(now, rawBody.toString('utf8'));
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header,
        secret: SECRET,
        now,
      }),
    ).not.toThrow();
  });

  it('rejects missing header', () => {
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header: undefined,
        secret: SECRET,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects malformed header (no t=)', () => {
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header: 'v1=abc',
        secret: SECRET,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects malformed header (no v1=)', () => {
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header: `t=${now}`,
        secret: SECRET,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects stale timestamp (>5 min old)', () => {
    const stale = now - 6 * 60 * 1000;
    const header = signature(stale, rawBody.toString('utf8'));
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header,
        secret: SECRET,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects future timestamp (>5 min ahead)', () => {
    const future = now + 6 * 60 * 1000;
    const header = signature(future, rawBody.toString('utf8'));
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header,
        secret: SECRET,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects mismatched signature (wrong secret)', () => {
    const header = signature(now, rawBody.toString('utf8'), 'other-secret');
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header,
        secret: SECRET,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });

  it('rejects mismatched signature (body tampered after signing)', () => {
    const header = signature(now, '{"different":"body"}');
    expect(() =>
      verifySanityWebhookSignature({
        rawBody,
        header,
        secret: SECRET,
        now,
      }),
    ).toThrow(UnauthorizedException);
  });
});
