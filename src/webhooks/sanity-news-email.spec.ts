import {
  buildSanityNewsEmail,
  resolveSanityImageUrl,
} from './sanity-news-email';
import { SanityNewsWebhookPayload } from './sanity-news.dto';

const PROJECT_ID = 'projX';
const DATASET = 'production';

const basePayload: SanityNewsWebhookPayload = {
  _id: 'doc1',
  _type: 'news',
  titleEn: 'New feature: announcements',
  titleTh: 'ฟีเจอร์ใหม่: ประกาศ',
  type: 'news',
  slug: { current: 'new-feature-announcements' },
  publishedAt: '2026-05-23T12:00:00Z',
};

describe('resolveSanityImageUrl', () => {
  it('builds the CDN URL from an asset ref', () => {
    const url = resolveSanityImageUrl(
      { asset: { _ref: 'image-abc123-1200x800-jpg' } },
      PROJECT_ID,
      DATASET,
    );
    expect(url).toBe(
      'https://cdn.sanity.io/images/projX/production/abc123-1200x800.jpg',
    );
  });

  it('returns null when asset ref is malformed', () => {
    expect(
      resolveSanityImageUrl(
        { asset: { _ref: 'not-an-image-ref' } },
        PROJECT_ID,
        DATASET,
      ),
    ).toBeNull();
  });

  it('returns null when image is undefined', () => {
    expect(resolveSanityImageUrl(undefined, PROJECT_ID, DATASET)).toBeNull();
  });
});

const CTX = { projectId: PROJECT_ID, dataset: DATASET };

describe('buildSanityNewsEmail', () => {
  it('en: subject uses only the English title with the news emoji', () => {
    const { subject } = buildSanityNewsEmail(basePayload, CTX, 'en');
    expect(subject).toBe('📰 New feature: announcements');
  });

  it('th: subject uses only the Thai title with the news emoji', () => {
    const { subject } = buildSanityNewsEmail(basePayload, CTX, 'th');
    expect(subject).toBe('📰 ฟีเจอร์ใหม่: ประกาศ');
  });

  it('truncates subject to 100 characters', () => {
    const longTitle = 'x'.repeat(120);
    const { subject } = buildSanityNewsEmail(
      { ...basePayload, titleEn: longTitle, titleTh: longTitle },
      CTX,
      'en',
    );
    expect(subject.length).toBeLessThanOrEqual(100);
  });

  it('en: body contains the English title and copy, not the Thai copy', () => {
    const { html } = buildSanityNewsEmail(basePayload, CTX, 'en');
    expect(html).toContain('New feature: announcements');
    expect(html).toContain("There's something new on Tatuga School");
    expect(html).not.toContain('ฟีเจอร์ใหม่: ประกาศ');
    expect(html).not.toContain('มีอัปเดตใหม่จาก Tatuga School');
  });

  it('th: body contains the Thai title and copy, not the English copy', () => {
    const { html } = buildSanityNewsEmail(basePayload, CTX, 'th');
    expect(html).toContain('ฟีเจอร์ใหม่: ประกาศ');
    expect(html).toContain('มีอัปเดตใหม่จาก Tatuga School');
    expect(html).not.toContain('New feature: announcements');
    expect(html).not.toContain("There's something new on Tatuga School");
  });

  it('links to tatugaschool.com/news/<slug> in both languages', () => {
    for (const lang of ['en', 'th'] as const) {
      const { html } = buildSanityNewsEmail(basePayload, CTX, lang);
      expect(html).toContain(
        'https://tatugaschool.com/news/new-feature-announcements',
      );
    }
  });

  it('includes the resolved cover image URL when present', () => {
    const { html } = buildSanityNewsEmail(
      {
        ...basePayload,
        coverImage: { asset: { _ref: 'image-abc-1200x800-jpg' } },
      },
      CTX,
      'en',
    );
    expect(html).toContain(
      'https://cdn.sanity.io/images/projX/production/abc-1200x800.jpg',
    );
  });

  it('omits the cover image when coverImage is absent', () => {
    const { html } = buildSanityNewsEmail(basePayload, CTX, 'en');
    expect(html).not.toContain('cdn.sanity.io');
  });

  it('includes the brand logo, banner, and address footer in every email', () => {
    for (const lang of ['en', 'th'] as const) {
      const { html } = buildSanityNewsEmail(basePayload, CTX, lang);
      expect(html).toContain('logo-tatugaschool.png');
      expect(html).toContain('banner-tatugaschool.jpg');
      expect(html).toContain('ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์');
    }
  });

  it('renders the type badge in the requested language only', () => {
    const en = buildSanityNewsEmail(
      { ...basePayload, type: 'announcement' },
      CTX,
      'en',
    );
    expect(en.html).toContain('Announcement');
    expect(en.html).not.toContain('ประกาศ');
    const th = buildSanityNewsEmail(
      { ...basePayload, type: 'announcement' },
      CTX,
      'th',
    );
    expect(th.html).toContain('ประกาศ');
    expect(th.html).not.toContain('Announcement');
  });
});
