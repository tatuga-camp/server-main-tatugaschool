import { BadRequestException } from '@nestjs/common';
import { assertSanityNewsPayload } from './sanity-news.dto';

describe('assertSanityNewsPayload', () => {
  const validPayload = {
    _id: 'abc123',
    _type: 'news',
    titleEn: 'Hello',
    titleTh: 'สวัสดี',
    type: 'news',
    slug: { current: 'hello' },
    publishedAt: '2026-05-23T12:00:00Z',
  };

  it('accepts a fully populated payload', () => {
    expect(() => assertSanityNewsPayload(validPayload)).not.toThrow();
  });

  it('accepts a payload with optional coverImage', () => {
    expect(() =>
      assertSanityNewsPayload({
        ...validPayload,
        coverImage: { asset: { _ref: 'image-abc-1200x800-jpg' } },
      }),
    ).not.toThrow();
  });

  it.each([
    ['null body', null],
    ['array body', []],
    ['string body', 'oops'],
    ['number body', 42],
  ])('rejects non-object body: %s', (_label, body) => {
    expect(() => assertSanityNewsPayload(body)).toThrow(BadRequestException);
  });

  it.each([
    '_id',
    'titleEn',
    'titleTh',
    'type',
    'publishedAt',
  ])('rejects payload missing required string field: %s', (field) => {
    const broken = { ...validPayload, [field]: '' };
    expect(() => assertSanityNewsPayload(broken)).toThrow(BadRequestException);
  });

  it('rejects payload with missing slug.current', () => {
    const broken = { ...validPayload, slug: { current: '' } };
    expect(() => assertSanityNewsPayload(broken)).toThrow(BadRequestException);
  });

  it('rejects payload with non-news _type', () => {
    const broken = { ...validPayload, _type: 'post' };
    expect(() => assertSanityNewsPayload(broken)).toThrow(BadRequestException);
  });

  it('rejects payload with unknown type value', () => {
    const broken = { ...validPayload, type: 'rumor' };
    expect(() => assertSanityNewsPayload(broken)).toThrow(BadRequestException);
  });
});
