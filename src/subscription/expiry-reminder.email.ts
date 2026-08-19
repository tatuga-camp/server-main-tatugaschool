export function buildExpiryReminderEmail(input: {
  schoolTitle: string;
  plan: string;
  daysLeft: number;
  expireAt: Date;
  renewUrl: string;
}): { subject: string; html: string } {
  const dayWord = input.daysLeft === 1 ? 'day' : 'days';
  const subject = `Your Tatuga School subscription expires in ${input.daysLeft} ${dayWord}`;
  const expireDate = input.expireAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Bangkok',
  });

  const html = `
   <body style="background-color: #f8f9fa;">
 <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
   <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
   <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
     <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
      The ${input.plan} subscription for ${input.schoolTitle} expires in ${input.daysLeft} ${dayWord}
     </h1>
     <p style="margin: 0 0 16px;">
      Your subscription is valid until <strong>${expireDate}</strong>.
      Renew now to keep all premium features active — the unused time on your
      current plan is applied as a credit, so you never pay twice for the same days.
     </p>
     <a href="${input.renewUrl}" style="display: inline-block; background-color: #2C7CD1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 0 0 16px;">
      Renew now
     </a>
     <p style="margin: 0 0 16px; color: #6c757d">
      Do not reply to this email, this email is automatically generated.
      If you have any questions, please contact this email permlap@tatugacamp.com or the address below
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
