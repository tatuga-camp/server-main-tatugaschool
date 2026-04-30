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
         <img class="ax-center" style="display: block; width: 600px" src="https://bucket.mailersendapp.com/z3m5jgr8emldpyo6/r9084zvk1oegw63d/images/a1a88788-ac1e-4530-a4f3-5cb7cba4e751.png" />
         <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
           <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
            เริ่มเทอมใหม่กับ Tatuga School - ลงทะเบียน Tatuga School Online Workshop ฟรีแถม Package Enterprise 6 เดือน!
           </h1>
           <p style="margin: 0 0 16px;">
           สวัสดีคุณครู ${user.firstName},<br>
           Tatuga School ขอเชิญคุณครู โรงเรียน บุคคลหรือหน่วยงานที่สนใจ ร่วมกิจกรรม Online Workshop พร้อมถ่ายทอด เทคนิคการใช้งาน Tatuga School **ฟรี! ไม่มีค่าใช้จ่ายตลอดการจัดกิจกรรมและแถม Package Enterprise 6 เดือน! หมดเขตวันที่ 31 พฤษภาคม 2569 เท่านั้น!! <a href="https://www.facebook.com/share/p/185rD95YXj/">รายละเอียดเพิ่มเติม</a>           
           </p>
            <p style="margin: 0 0 16px; color: #6c757d">
            Do not reply to this email, this email is automatically generated.
            If you have any questions, please contact this email permlap@tatugacamp.com or the address below
           </p>
           <a style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 4px;" href="https://docs.google.com/forms/d/e/1FAIpQLSds3dB6zzO_QrCAd3_Z0o65dWTtNd3vdBqxCH1VU0HCXSOH9g/viewform?usp=dialog">คลิกเพื่อลงทะเบียน</a>
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
          .setSubject(' เริ่มเทอมใหม่กับ Tatuga School!')
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
