import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';

const prisma = new PrismaClient();
const config = new ConfigService();
const mailerSend = new MailerSend({
  apiKey: config.get('EMAIL_API_KEY'),
});

const main = async () => {
  try {
    const users = await prisma.user.findMany({
      where: {
        isDoneSurvey: false,
      },
      take: 500,
    });

    const bulkEmails = [];
    const sender = new Sender('support@tatugaschool.com', 'Tatuga School');
    for (const user of users) {
      const formURL = `https://docs.google.com/forms/d/e/1FAIpQLSc8uFj0dRFeTXwoMbMlQnBKO4Ow48fawj5XyJTcYjiFKc_4Sw/viewform?usp=pp_url&entry.752037651=${user.email}`;

      const emailHTML = `
         <body style="background-color: #f8f9fa;">
       <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
         <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
           <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
            เหมือนคุณครูจะลืมกรอก แบบสอบถามความพึงพอใจ ที่ทางเราส่งไปก่อนหน้านี้
           </h1>
           <p style="margin: 0 0 16px;">
           สวัสดีคุณครู ${user.firstName},<br>
          ทางเราอยากรบกวนเวลาประมาณ 3 นาทีในการกรอกแบบความพึงพอใจในการใช้งาน Tatuga School ของเรา หลังจากที่คุณครู ได้ใช้งานมา
          ข้อมูลเหล่านี้จะถูกใช้ในการยื่นรับทุนพัฒนานวัตกรรมทางการศึกษาของโครงการ TedFund
           </p>
            <p style="margin: 0 0 16px; color: #6c757d">
            Do not reply to this email, this email is automatically generated.
            If you have any questions, please contact this email permlap@tatugacamp.com or the address below
           </p>
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="${formURL}">คลิกเพื่อตอบแบบสอบถาม</a>
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
      const emailParams = new EmailParams()
        .setFrom(sender)
        .setTo([
          new Recipient(user.email, `${user.firstName} ${user.lastName}`),
        ])
        .setSubject('แบบสอบถามความพึงพอใจในการใช้งาน Tatuga School!')
        .setHtml(emailHTML);
      bulkEmails.push(emailParams);
    }
    await mailerSend.email.sendBulk(bulkEmails);
    const update = await Promise.all(
      users.map((user) =>
        prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            isDoneSurvey: true,
          },
        }),
      ),
    );
    console.log(update.length);
  } catch (error) {
    console.error(error);
  }
};

main();
