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

describe('buildSanityNewsEmail', () => {
  it('produces a subject combining both languages with the news emoji', () => {
    const { subject } = buildSanityNewsEmail(basePayload, {
      projectId: PROJECT_ID,
      dataset: DATASET,
    });
    expect(subject).toBe(
      '📰 New feature: announcements / ฟีเจอร์ใหม่: ประกาศ',
    );
  });

  it('truncates subject to 100 characters', () => {
    const longTitle = 'x'.repeat(120);
    const { subject } = buildSanityNewsEmail(
      { ...basePayload, titleEn: longTitle, titleTh: longTitle },
      { projectId: PROJECT_ID, dataset: DATASET },
    );
    expect(subject.length).toBeLessThanOrEqual(100);
  });

  it('includes both titles in the HTML body', () => {
    const { html } = buildSanityNewsEmail(basePayload, {
      projectId: PROJECT_ID,
      dataset: DATASET,
    });
    expect(html).toContain('New feature: announcements');
    expect(html).toContain('ฟีเจอร์ใหม่: ประกาศ');
  });

  it('links to tatugaschool.com/news/<slug>', () => {
    const { html } = buildSanityNewsEmail(basePayload, {
      projectId: PROJECT_ID,
      dataset: DATASET,
    });
    expect(html).toContain(
      'https://tatugaschool.com/news/new-feature-announcements',
    );
  });

  it('includes the resolved cover image URL when present', () => {
    const { html } = buildSanityNewsEmail(
      {
        ...basePayload,
        coverImage: { asset: { _ref: 'image-abc-1200x800-jpg' } },
      },
      { projectId: PROJECT_ID, dataset: DATASET },
    );
    expect(html).toContain(
      'https://cdn.sanity.io/images/projX/production/abc-1200x800.jpg',
    );
  });

  it('omits the cover image when coverImage is absent', () => {
    const { html } = buildSanityNewsEmail(basePayload, {
      projectId: PROJECT_ID,
      dataset: DATASET,
    });
    expect(html).not.toContain('cdn.sanity.io');
  });

  it('includes the brand logo and banner in every email', () => {
    const { html } = buildSanityNewsEmail(basePayload, {
      projectId: PROJECT_ID,
      dataset: DATASET,
    });
    expect(html).toContain('logo-tatugaschool.png');
    expect(html).toContain('banner-tatugaschool.jpg');
  });

  it('includes the Thai company address footer', () => {
    const { html } = buildSanityNewsEmail(basePayload, {
      projectId: PROJECT_ID,
      dataset: DATASET,
    });
    expect(html).toContain('ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์');
    expect(html).toContain('permlap@tatugacamp.com');
  });

  it('renders a type badge', () => {
    const { html } = buildSanityNewsEmail(
      { ...basePayload, type: 'announcement' },
      { projectId: PROJECT_ID, dataset: DATASET },
    );
    expect(html.toLowerCase()).toContain('announcement');
  });
});
