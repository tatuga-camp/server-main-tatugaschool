import { Language } from '@prisma/client';

export function buildVerifyEmail(input: {
  firstName: string;
  verifyUrl: string;
  language: Language;
}): { subject: string; html: string } {
  const isTh = input.language === 'th';

  const subject = isTh
    ? 'ยืนยันอีเมลเพื่อเข้าสู่ระบบ Tatuga School'
    : 'Verify your email to login on Tatuga School';
  const heading = subject;

  const body = isTh
    ? `สวัสดีคุณ ${input.firstName},<br>
           ขอบคุณที่สมัครใช้งาน! กดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ`
    : `Hello ${input.firstName},<br>
           Thank you for signing up! Click button below to verify your e-mail`;

  const noReply = isTh
    ? `อีเมลนี้ถูกสร้างขึ้นโดยอัตโนมัติ กรุณาอย่าตอบกลับ
            หากมีคำถาม โปรดติดต่อ permlap@tatugacamp.com หรือที่อยู่ด้านล่าง`
    : `Do not reply to this email, this email is automatically generated.
            If you have any questions, please contact this email permlap@tatugacamp.com or the address below`;

  const cta = isTh ? 'ยืนยันอีเมล' : 'Verify Email';

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
            <p style="margin: 0 0 16px; color: #6c757d">
            ${noReply}
           </p>
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${input.verifyUrl}">${cta}</a>
         </div>
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 160px;" src="https://storage.googleapis.com/public-tatugaschool/banner-tatugaschool.jpg" />
         <div style="color: #6c757d; text-align: center; margin: 24px 0;">
         Tatuga School - ห้างหุ้นส่วนจำกัด ทาทูก้าแคมป์ <br>
         879 หมู่3 ตำบลโพธิ์กลาง อำเภอเมืองนครราชสีมา จ.นครราชสีมา 30000<br>
         โทร 0610277960 Email: permlap@tatugacamp.com<br>
         </div>
       </div>
     </body>
     `;
  return { subject, html };
}
