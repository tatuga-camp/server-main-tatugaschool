import {
  SanityImageRef,
  SanityNewsType,
  SanityNewsWebhookPayload,
} from './sanity-news.dto';

const NEWS_BASE_URL = 'https://tatugaschool.com/news';
const MAX_SUBJECT_LENGTH = 100;

const TYPE_LABELS: Record<SanityNewsType, { en: string; th: string }> = {
  feature: { en: 'Feature', th: 'ฟีเจอร์' },
  fix: { en: 'Fix', th: 'แก้ไข' },
  news: { en: 'News', th: 'ข่าวสาร' },
  announcement: { en: 'Announcement', th: 'ประกาศ' },
};

export interface SanityImageContext {
  projectId: string;
  dataset: string;
}

const IMAGE_REF_PATTERN = /^image-([a-zA-Z0-9]+)-([0-9]+x[0-9]+)-([a-zA-Z0-9]+)$/;

export function resolveSanityImageUrl(
  image: SanityImageRef | undefined,
  projectId: string,
  dataset: string,
): string | null {
  if (!image?.asset?._ref) return null;
  const match = IMAGE_REF_PATTERN.exec(image.asset._ref);
  if (!match) return null;
  const [, id, dims, ext] = match;
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dims}.${ext}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max - 1) + '…';
}

export function buildSanityNewsEmail(
  payload: SanityNewsWebhookPayload,
  context: SanityImageContext,
): { subject: string; html: string } {
  const subject = truncate(
    `📰 ${payload.titleEn} / ${payload.titleTh}`,
    MAX_SUBJECT_LENGTH,
  );

  const articleUrl = `${NEWS_BASE_URL}/${encodeURIComponent(payload.slug.current)}`;
  const imageUrl = resolveSanityImageUrl(
    payload.coverImage,
    context.projectId,
    context.dataset,
  );
  const labels = TYPE_LABELS[payload.type];

  const titleEn = escapeHtml(payload.titleEn);
  const titleTh = escapeHtml(payload.titleTh);
  const labelEn = escapeHtml(labels.en);
  const labelTh = escapeHtml(labels.th);

  const imageBlock = imageUrl
    ? `<img src="${imageUrl}" alt="" style="max-width:100%;border-radius:8px;margin:16px 0;" />`
    : '';

  return {
    subject,
    html: `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
  <p style="display:inline-block;padding:4px 10px;background:#eef;color:#225;border-radius:999px;font-size:12px;margin:0 0 12px 0;">
    ${labelEn} · ${labelTh}
  </p>
  ${imageBlock}
  <h1 style="font-size:22px;margin:0 0 8px 0;">${titleEn}</h1>
  <p style="margin:0 0 24px 0;color:#444;">There's something new on Tatuga School.</p>

  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

  <h1 style="font-size:22px;margin:0 0 8px 0;">${titleTh}</h1>
  <p style="margin:0 0 24px 0;color:#444;">มีอัปเดตใหม่จาก Tatuga School</p>

  <p style="margin:32px 0;">
    <a href="${articleUrl}"
       style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
      Read more / อ่านต่อ
    </a>
  </p>

  <p style="margin-top:48px;color:#888;font-size:12px;">
    Tatuga School · <a href="mailto:support@tatugaschool.com" style="color:#888;">support@tatugaschool.com</a>
  </p>
</body></html>`,
  };
}
