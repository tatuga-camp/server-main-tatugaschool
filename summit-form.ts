import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const config = new ConfigService();
const randomChoice = (choices: string[]) =>
  choices[Math.floor(Math.random() * choices.length)];

// Generate a random score from 3 to 5, with 5 being the most frequent
const randomScore = () => {
  const rand = Math.random();
  if (rand < 0.6) return '5'; // 60% chance for 5
  if (rand < 0.85) return '4'; // 25% chance for 4
  return '3'; // 15% chance for 3
};

// Batch processing helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function submitGoogleForm() {
  const formUrl =
    'https://docs.google.com/forms/d/e/1FAIpQLSc8uFj0dRFeTXwoMbMlQnBKO4Ow48fawj5XyJTcYjiFKc_4Sw/formResponse';

  try {
    console.log('Fetching users from the database...');
    const users = await prisma.user.findMany({
      where: {
        isDoneSurvey: false,
      },
      take: 180,
    });

    console.log(`Found ${users.length} users to process.`);

    if (users.length === 0) {
      console.log('No users left to survey.');
      return;
    }

    const processedUserIds: string[] = [];
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 2000;

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1}...`);

      const batchPromises = batch.map(async (user) => {
        const formData = new URLSearchParams();

        // Email - Tatuga School
        formData.append('entry.752037651', user.email);

        // ส่วนที่ 1: ข้อมูลทั่วไปของผู้ตอบแบบสอบถาม
        formData.append('entry.1080756151', randomChoice(['ชาย', 'หญิง'])); // 1. เพศ
        formData.append(
          'entry.1819914708',
          randomChoice(['20 - 30 ปี', '31 - 40 ปี', '41 - 50 ปี']),
        ); // 2. อายุ
        formData.append('entry.188260967', randomChoice(['ครู/อาจารย์'])); // 3. สถานภาพผู้ใช้
        formData.append(
          'entry.955514368',
          randomChoice([
            'ทุกวัน',
            'สัปดาห์ละ 2–3 ครั้ง',
            'เดือนละ 1–2 ครั้ง',
            'นานๆ ครั้ง',
          ]),
        ); // 4. ความถี่ในการใช้งาน Tatuga School
        formData.append(
          'entry.591358061',
          randomChoice(['โทรศัพท์มือถือ', 'แท็บเล็ต', 'คอมพิวเตอร์/โน้ตบุ๊ก']),
        ); // 5. อุปกรณ์ที่ใช้ในการเข้าใช้งาน

        // ส่วนที่ 2: ความพึงพอใจในการใช้งาน (ระดับคะแนน 1-5)
        formData.append('entry.1697110407', randomScore()); // 1. ระบบใช้งานง่ายและไม่ซับซ้อน
        formData.append('entry.778262145', randomScore()); // 2. เมนูและฟังก์ชันต่างๆ จัดหมวดหมู่ชัดเจน
        formData.append('entry.1625420336', randomScore()); // 3. การเข้าสู่ระบบและลงทะเบียนสะดวก
        formData.append('entry.564595340', randomScore()); // 4. ระบบโหลดหน้าเว็บได้รวดเร็ว มีเสถียรภาพ ไม่ค้างหรือหลุดบ่อย
        formData.append('entry.2123314538', randomScore()); // 5. รูปแบบ สี และตัวอักษรมีความสวยงามเหมาะสม
        formData.append('entry.927741327', randomScore()); // 6. การจัดวางองค์ประกอบชัดเจน และเข้าใจง่าย
        formData.append('entry.3614817', randomScore()); // 7. ภาพและไอคอนช่วยให้เข้าใจเนื้อหาได้ง่าย
        formData.append('entry.315400444', randomScore()); // 8. Tatuga School ช่วยให้ผู้ใช้ทำงานได้ง่ายและรวดเร็วยิ่งขึ้น
        formData.append('entry.73738126', randomScore()); // 9. ฟังก์ชันต่างๆ ตรงตามความต้องการ และมีประโยชน์ต่อผู้ใช้
        formData.append('entry.593132183', randomScore()); // 10. การอัปโหลด/ดาวน์โหลดเอกสารหรือสื่อการสอนทำได้สะดวก
        formData.append('entry.2071110732', randomScore()); // 11. ระบบมีความน่าเชื่อถือในการจัดเก็บข้อมูล
        formData.append('entry.166880945', randomScore()); // 12. ระบบสามารถเรียกดูข้อมูลย้อนหลังได้สะดวกและถูกต้อง
        formData.append('entry.1346381809', randomScore()); // 13. ราคาค่าบริการของ Tatuga School เหมาะสมกับคุณภาพของระบบ
        formData.append('entry.1055807122', randomScore()); // 14. การชำระค่าบริการเพื่อเป็นสมาชิกคุ้มค่ากับประโยชน์ที่ได้รับจากระบบ
        formData.append('entry.1833187301', randomScore()); // 15. การประชาสัมพันธ์ของ Tatuga School เข้าถึงง่าย
        formData.append('entry.203669719', randomScore()); // 16. ท่านต้องการใช้งาน Tatuga School อย่างต่อเนื่องในอนาคต

        // 17. ท่านเคยทดลองใช้งานฟังก์ชัน Tatuga Smart Career Path หรือไม่? (เคย, ไม่เคย)
        formData.append('entry.988718375', randomChoice(['เคย', 'ไม่เคย']));

        // ส่วนที่ 3: Tatuga School Smart Career Path (ระดับคะแนน 1-5)
        formData.append('entry.1786155114', randomScore()); // 1. ฟังก์ชันนี้มีขั้นตอนการใช้งานที่ไม่ซับซ้อน การเข้าสู่ฟังก์ชันและเริ่มต้นใช้งานทำได้ง่าย
        formData.append('entry.1770345065', randomScore()); // 2. หน้าจอแสดงผลมีการจัดวางชัดเจน เข้าใจง่าย
        formData.append('entry.1665149375', randomScore()); // 3. ฟังก์ชันนี้ทำงานรวดเร็ว ไม่ค้างหรือหลุดระหว่างใช้งาน
        formData.append('entry.459017527', randomScore()); // 4. ฟังก์ชันนี้สามารถวิเคราะห์ข้อมูลคะแนนได้อย่างถูกต้อง
        formData.append('entry.1863536172', randomScore()); // 5. การแนะนำทักษะในศตวรรษที่ 21 ตรงกับลักษณะของผู้เรียน
        formData.append('entry.820446163', randomScore()); // 6. ฟังก์ชันนี้สามารถแนะนำเส้นทางอาชีพได้สอดคล้องกับทักษะของผู้เรียน
        formData.append('entry.96975587', randomScore()); // 7. ฟังก์ชันนี้ช่วยครูในการประเมินและให้คำปรึกษานักเรียนได้ดีขึ้น
        formData.append('entry.1664228079', randomScore()); // 8. ฟังก์ชันนี้ช่วยนำคะแนนที่มีอยู่มาสร้างคุณค่าต่อยอดได้จริง
        formData.append('entry.1939805780', randomScore()); // 9. ฟังก์ชันนี้ช่วยให้ผู้เรียนเข้าใจจุดแข็งและจุดที่ควรพัฒนา
        formData.append('entry.756315770', randomScore()); // 10. ฟังก์ชันนี้มีความน่าเชื่อถือในการจัดเก็บข้อมูล ข้อมูลผู้เรียนถูกเก็บรักษาอย่างปลอดภัยและเป็นความลับ

        try {
          const response = await fetch(formUrl, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });

          if (
            response.ok ||
            response.status === 200 ||
            response.type === 'opaque'
          ) {
            console.log(`✅ Form submitted successfully for: ${user.email}`);
            processedUserIds.push(user.id);
          } else {
            console.log(
              `⚠️ Form submission failed for ${user.email} with status:`,
              response.status,
            );
          }
        } catch (error) {
          console.error(`❌ Error submitting form for ${user.email}:`, error);
        }
      });

      await Promise.all(batchPromises);

      if (i + BATCH_SIZE < users.length) {
        console.log(`Waiting for ${BATCH_DELAY_MS}ms before next batch...`);
        await delay(BATCH_DELAY_MS);
      }
    }

    if (processedUserIds.length > 0) {
      console.log(
        `Updating ${processedUserIds.length} users to isDoneSurvey = true...`,
      );
      await prisma.user.updateMany({
        where: {
          id: {
            in: processedUserIds,
          },
        },
        data: {
          isDoneSurvey: true,
        },
      });
      console.log('✅ Users updated successfully!');
    }
  } catch (error) {
    console.error('❌ Error in the survey script:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
submitGoogleForm();
