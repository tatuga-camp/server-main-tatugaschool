import { Language } from '@prisma/client';

export function buildExpiryReminderEmail(input: {
  schoolTitle: string;
  plan: string;
  daysLeft: number;
  expireAt: Date;
  renewUrl: string;
  language: Language;
}): { subject: string; html: string } {
  const isTh = input.language === 'th';
  const dayWord = input.daysLeft === 1 ? 'day' : 'days';

  const subject = isTh
    ? `แพ็กเกจ Tatuga School ของคุณจะหมดอายุในอีก ${input.daysLeft} วัน`
    : `Your Tatuga School subscription expires in ${input.daysLeft} ${dayWord}`;

  const expireDate = input.expireAt.toLocaleDateString(
    isTh ? 'th-TH' : 'en-GB',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Bangkok',
    },
  );

  const heading = isTh
    ? `แพ็กเกจ ${input.plan} ของโรงเรียน ${input.schoolTitle} จะหมดอายุในอีก ${input.daysLeft} วัน`
    : `The ${input.plan} subscription for ${input.schoolTitle} expires in ${input.daysLeft} ${dayWord}`;

  const body = isTh
    ? `แพ็กเกจของคุณใช้งานได้ถึงวันที่ <strong>${expireDate}</strong>
      ต่ออายุตอนนี้เพื่อใช้งานฟีเจอร์พรีเมียมทั้งหมดได้ต่อเนื่อง — เวลาที่เหลือของแพ็กเกจปัจจุบัน
      จะถูกคำนวณเป็นส่วนลดให้ คุณจะไม่จ่ายซ้ำสำหรับช่วงเวลาเดิม`
    : `Your subscription is valid until <strong>${expireDate}</strong>.
      Renew now to keep all premium features active — the unused time on your
      current plan is applied as a credit, so you never pay twice for the same days.`;

  const cta = isTh ? 'ต่ออายุตอนนี้' : 'Renew now';

  const noReply = isTh
    ? `อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
      หากมีข้อสงสัยกรุณาติดต่อ permlap@tatugacamp.com หรือที่อยู่ด้านล่าง`
    : `Do not reply to this email, this email is automatically generated.
      If you have any questions, please contact this email permlap@tatugacamp.com or the address below`;

  const html = `
   <body style="background-color: #f8f9fa;">
 <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
   <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
   <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
     <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
      ${heading}
     </h1>
     <p style="margin: 0 0 16px;">
      ${body}
     </p>
     <a href="${input.renewUrl}" style="display: inline-block; background-color: #2C7CD1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 0 0 16px;">
      ${cta}
     </a>
     <p style="margin: 0 0 16px; color: #6c757d">
      ${noReply}
     </p>
   </div>
   <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/public-tatugaschool/banner-tatugaschool.jpg" />
   <div style="color: #6c757d; text-align: center; margin: 24px 0;">
   Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
   288/2 ซอยมิตรภาพ 8 ตำบลในเมือง อำเภอเมืองนครราชสีมา จ.นครราชสีีมา 30000<br>
   โทร 0610277960 Email: permlap@tatugacamp.com<br>
   </div>
 </div>
</body>
`;
  return { subject, html };
}
