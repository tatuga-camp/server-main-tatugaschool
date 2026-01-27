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
    let cursor: string | undefined;
    const take = 500;
    let totalSent = 0;

    console.log('Starting email blast...');

    while (true) {
      const params: Prisma.UserFindManyArgs = {
        take,
        orderBy: { id: 'asc' },
        where: {
          isVerifyEmail: true,
        },
      };

      if (cursor) {
        params.cursor = { id: cursor };
        params.skip = 1;
      }

      const users = await prisma.user.findMany(params);

      if (users.length === 0) {
        console.log('No more users to send.');
        break;
      }

      console.log(`Processing batch of ${users.length} users...`);

      const bulkEmails = [];
      const sender = new Sender('support@tatugaschool.com', 'Tatuga School');

      for (const user of users) {
        const emailHTML = `
         <body style="background-color: #f8f9fa;">
       <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
         <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
         <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
           <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
           อัปเดตราคาแพ็กเกจรายปีสุดคุ้ม!
           </h1>
           <p style="margin: 0 0 16px;">
           สวัสดีคุณครู ${user.firstName},<br>
           ทาง Tatuga School ได้มีการปรับปรุงแพ็กเกจรายปีใหม่ เพื่อให้คุ้มค่ายิ่งขึ้น สำหรับคุณครูและโรงเรียน
           </p>
           
           <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #bae6fd;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #0284c7; font-size: 18px;">Basic Plan (พื้นฐาน)</p>
            <p style="margin: 0; font-size: 16px;">ราคาเพียง 590 บาท/ปี <span style="font-size: 14px; color: #0284c7;">(ตกเดือนละ 49 บาท)</span></p>
           </div>
           
           <div style="background-color: #f3e8ff; padding: 16px; border-radius: 8px; margin-bottom: 16px; border: 1px solid #d8b4fe;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #7e22ce; font-size: 18px;">Premium Plan (พรีเมียม)</p>
            <p style="margin: 0; font-size: 16px;">ราคาเพียง 1,490 บาท/ปี <span style="font-size: 14px; color: #7e22ce;">(ตกเดือนละ 124 บาท)</span></p>
           </div>

            <p style="margin: 0 0 16px; color: #6c757d">
            Do not reply to this email, this email is automatically generated.
            If you have any questions, please contact this email permlap@tatugacamp.com or the address below
           </p>
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="https://tatugaschool.com/price">ดูรายละเอียดแพ็กเกจ</a>
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
          .setSubject('อัปเดตราคาแพ็กเกจรายปีใหม่! เริ่มต้นเพียง 590 บาท')
          .setHtml(emailHTML);
        bulkEmails.push(emailParams);
      }

      await mailerSend.email.sendBulk(bulkEmails);
      totalSent += bulkEmails.length;
      console.log(
        `Sent batch of ${bulkEmails.length} emails. Total sent: ${totalSent}`,
      );

      // Update cursor
      cursor = users[users.length - 1].id;

      if (users.length < take) {
        console.log('All emails sent.');
        break;
      }

      // Pause for 60 seconds
      console.log('Waiting 60 seconds before next batch...');
      await new Promise((resolve) => setTimeout(resolve, 1000 * 61));
    }
  } catch (error) {
    console.error('Error sending emails:', error);
  } finally {
    await prisma.$disconnect();
  }
};

main();
