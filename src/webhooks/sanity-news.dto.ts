import { BadRequestException } from '@nestjs/common';

export type SanityNewsType = 'feature' | 'fix' | 'news' | 'announcement';

export interface SanityImageRef {
  asset: { _ref: string };
}

export interface SanityNewsWebhookPayload {
  _id: string;
  _type: 'news';
  titleEn: string;
  titleTh: string;
  type: SanityNewsType;
  slug: { current: string };
  publishedAt: string;
  coverImage?: SanityImageRef;
}

const ALLOWED_TYPES: ReadonlySet<SanityNewsType> = new Set([
  'feature',
  'fix',
  'news',
  'announcement',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function assertSanityNewsPayload(
  body: unknown,
): asserts body is SanityNewsWebhookPayload {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Sanity payload must be an object');
  }

  const b = body as Record<string, unknown>;

  if (b._type !== 'news') {
    throw new BadRequestException(`Unexpected _type: ${String(b._type)}`);
  }

  for (const field of ['_id', 'titleEn', 'titleTh', 'publishedAt'] as const) {
    if (!isNonEmptyString(b[field])) {
      throw new BadRequestException(`Missing or empty field: ${field}`);
    }
  }

  if (!isNonEmptyString(b.type) || !ALLOWED_TYPES.has(b.type as SanityNewsType)) {
    throw new BadRequestException(`Invalid type: ${String(b.type)}`);
  }

  const slug = b.slug as { current?: unknown } | undefined;
  if (!slug || !isNonEmptyString(slug.current)) {
    throw new BadRequestException('Missing or empty slug.current');
  }
}
