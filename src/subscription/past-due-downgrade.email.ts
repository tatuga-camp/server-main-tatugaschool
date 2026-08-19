/**
 * Thai-only notice sent to the billing manager when their school's
 * subscription went past_due and the school was downgraded to FREE.
 * Sent from the customer.subscription.updated webhook case and from
 * scripts/downgrade-past-due-schools.ts.
 */
export function buildPastDueDowngradeEmail(input: {
  schoolTitle: string;
  plan: string;
  billingUrl: string;
}): { subject: string; html: string } {
  const subject = `แพ็กเกจของโรงเรียน ${input.schoolTitle} ถูกปรับเป็นแผนฟรีเนื่องจากค้างชำระ`;

  const html = `
   <body style="background-color: #f8f9fa;">
 <div style="margin: 0 auto; max-width: 600px; padding: 20px;">
   <img class="ax-center" style="display: block; margin: 40px auto 0; width: 96px;" src="https://storage.googleapis.com/public-tatugaschool/logo-tatugaschool.png" />
   <div style="background-color: #ffffff; padding: 24px 32px; margin: 40px 0; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
     <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 16px;">
      แพ็กเกจ ${input.plan} ของโรงเรียน ${input.schoolTitle} ถูกปรับเป็นแผนฟรี
     </h1>
     <p style="margin: 0 0 16px;">
      เนื่องจากใบแจ้งหนี้สำหรับการต่ออายุยังไม่ได้รับการชำระ ระบบจึงปรับโรงเรียนของคุณเป็นแผนฟรีชั่วคราว
      ห้องเรียนและรายวิชาที่เกินจำนวนของแผนฟรีจะถูกล็อกไว้ แต่ข้อมูลทั้งหมดยังอยู่ครบถ้วน
     </p>
     <p style="margin: 0 0 16px;">
      หากต้องการกลับมาใช้งานแผนเดิม สามารถชำระใบแจ้งหนี้ที่ค้างอยู่ หรือสมัครแพ็กเกจใหม่ได้ที่หน้าจัดการโรงเรียน
      ระบบจะคืนสถานะแพ็กเกจให้อัตโนมัติทันทีที่การชำระเงินสำเร็จ
     </p>
     <a href="${input.billingUrl}" style="display: inline-block; background-color: #2C7CD1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin: 0 0 16px;">
      จัดการแพ็กเกจ
     </a>
     <p style="margin: 0 0 16px; color: #6c757d">
      อีเมลฉบับนี้ส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ
      หากมีข้อสงสัยกรุณาติดต่อ permlap@tatugacamp.com หรือที่อยู่ด้านล่าง
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
