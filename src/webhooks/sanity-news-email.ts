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

  const coverImageBlock = imageUrl
    ? `<img alt="" style="display:block; width:100%; border-radius:6px; margin:0 0 20px;" src="${imageUrl}" />`
    : '';

  return {
    subject,
    html: `<body style="background-color: #f8f9fa;">
  <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
    <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
    <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
      <p style="display: inline-block; padding: 4px 12px; background-color: #e7f1ff; color: #0d6efd; border-radius: 999px; font-size: 12px; font-weight: 700; margin: 0 0 16px;">
        ${labelEn} · ${labelTh}
      </p>
      ${coverImageBlock}
      <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
        ${titleEn}
      </h1>
      <p style="margin: 0 0 16px;">
        There's something new on Tatuga School. Click the link below to read it on our website.
      </p>
      <p style="margin: 0 0 16px; color: #6c757d">
        Do not reply to this email, this email is automatically generated.
        If you have any questions, please contact this email permlap@tatugacamp.com or the address below
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
        ${titleTh}
      </h1>
      <p style="margin: 0 0 16px;">
        มีอัปเดตใหม่จาก Tatuga School คลิกที่ลิงก์ด้านล่างเพื่ออ่านบนเว็บไซต์ของเรา
      </p>
      <p style="margin: 0 0 24px; color: #6c757d">
        อีเมลนี้ถูกสร้างขึ้นโดยอัตโนมัติ กรุณาอย่าตอบกลับ
        หากมีคำถาม โปรดติดต่อ permlap@tatugacamp.com หรือที่อยู่ด้านล่าง
      </p>
      <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${articleUrl}">Read more / อ่านต่อ</a>
    </div>
    <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/public-tatugaschool/banner-tatugaschool.jpg" />
    <div style="color: #6c757d; text-align: center; margin: 24px 0;">
      Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
      288/2 ซอยมิตรภาพ 8 ตำบลในเมือง อำเภอเมืองนครราชสีมา จ.นครราชสีีมา 30000<br>
      โทร 0610277960 Email: permlap@tatugacamp.com<br>
    </div>
  </div>
</body>`,
  };
}
