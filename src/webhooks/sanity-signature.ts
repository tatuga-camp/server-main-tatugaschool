import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export interface VerifySanityWebhookSignatureParams {
  rawBody: Buffer;
  header: string | undefined;
  secret: string;
  now?: number;
}

export function verifySanityWebhookSignature(
  params: VerifySanityWebhookSignatureParams,
): void {
  const { rawBody, header, secret } = params;
  const now = params.now ?? Date.now();

  if (!header) {
    throw new UnauthorizedException('Missing Sanity signature');
  }

  const parts: Record<string, string> = {};
  for (const segment of header.split(',')) {
    const eq = segment.indexOf('=');
    if (eq === -1) continue;
    parts[segment.slice(0, eq).trim()] = segment.slice(eq + 1).trim();
  }

  const ts = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(ts) || !v1) {
    throw new UnauthorizedException('Malformed Sanity signature');
  }

  if (Math.abs(now - ts) > FIVE_MINUTES_MS) {
    throw new UnauthorizedException('Stale Sanity webhook');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${ts}.${rawBody.toString('utf8')}`)
    .digest('base64url');

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(v1);

  if (
    expectedBuf.length !== providedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, providedBuf)
  ) {
    throw new UnauthorizedException('Invalid Sanity signature');
  }
}
