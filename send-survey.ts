import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';

const prisma = new PrismaClient();
const config = new ConfigService();
const mailerSend = new MailerSend({
  apiKey: config.get('EMAIL_API_KEY'),
});

const emails = [
  {
    field1: 'nuwi55533@gmail.com',
  },
  {
    field1: 'nattapon.kaewjan@gmail.com',
  },
  {
    field1: 'somchaithumariya@gmail.com',
  },
  {
    field1: 'chainarong.clr@gmail.com',
  },
  {
    field1: 'krupaweena27@gmail.com',
  },
  {
    field1: 'suriya9776lt@gmail.com',
  },
  {
    field1: 'noppadol15@pasang.ac.th',
  },
  {
    field1: 'piakpea@gmail.com',
  },
  {
    field1: 'sunit.apt203@gmail.com',
  },
  {
    field1: 'mpannawatsanmatr@gmail.com',
  },
  {
    field1: 'thatsapol.chu@crru.ac.th',
  },
  {
    field1: 'thatsapol2015@gmail.com',
  },
  {
    field1: 'admin@yabee.ac.th',
  },
  {
    field1: 'chaimath2514@gmail.com',
  },
  {
    field1: 'engdsr54@dsr.ac.th',
  },
  {
    field1: 'jantanita02@gmail.com',
  },
  {
    field1: 'rikchana@gmail.com',
  },
  {
    field1: 'marisa.prim1991@gmail.com',
  },
  {
    field1: 'jakkitthong1705@gmail.com',
  },
  {
    field1: 'ouioui2020@gmail.com',
  },
  {
    field1: 'kanokporn.supan@sirin.ac.th',
  },
  {
    field1: 'khemmachartmon@gmail.com',
  },
  {
    field1: 'ajchara.son@gmail.com',
  },
  {
    field1: 'ajthotmst@gmail.com',
  },
  {
    field1: 'areeya.mad@gmail.com',
  },
  {
    field1: 'worawit.s@psuwitsurat.ac.th',
  },
  {
    field1: 'pakjirar@bkkprep.ac.th',
  },
  {
    field1: 'nongyao.boonsing@gmail.com',
  },
  {
    field1: 'momdumo@gmail.com',
  },
  {
    field1: 'khwanruthai@taphanhin.ac.th',
  },
  {
    field1: 'faii.sut@gmail.com',
  },
  {
    field1: 'Kruwaroot.boonchum@gmail.com',
  },
  {
    field1: 'nalin.si@ssru.ac.th',
  },
  {
    field1: 'chaiwenalo817@gmail.com',
  },
  {
    field1: 'ravinan4727@gmail.com',
  },
  {
    field1: 'woraphan020@gmail.com',
  },
  {
    field1: 'natthakon6@gmail.com',
  },
  {
    field1: 'earth.nipat@gmail.com',
  },
  {
    field1: 'opkradae@gmail.com',
  },
  {
    field1: 'niyapanpak.tingly2828@gmail.com',
  },
  {
    field1: 'buncha.wlh@gmail.com',
  },
  {
    field1: 'hamewwong@gmail.com',
  },
  {
    field1: 'Kruketsuda@watnangsao.ac.th',
  },
  {
    field1: 'choknue.2004@gmail.com',
  },
  {
    field1: 'webmasterbeer@gmail.com',
  },
  {
    field1: 'teacher4.0school@gmail.com',
  },
  {
    field1: 'krunaa.me@gmail.com',
  },
  {
    field1: 'pitchaya.keawpolngam@gmail.com',
  },
  {
    field1: 'Tharawadee261044@gmail.com',
  },
  {
    field1: 'sirilakthongkaew1979@gmail.com',
  },
  {
    field1: 'keeyapat.porry@gmail.com',
  },
  {
    field1: 'Phattraporn199942@gmail.com',
  },
  {
    field1: 'gingkan.num@takhli.ac.th',
  },
  {
    field1: 'j.wanftm@gmail.com',
  },
  {
    field1: 'sukanyathammanoonrak@gmail.com',
  },
  {
    field1: 'peez.tz@gmail.com',
  },
  {
    field1: 'narison2561@gmail.com',
  },
  {
    field1: 'goppypooh2@gmail.com',
  },
  {
    field1: 'jetnarong.hisswu@gmail.com',
  },
  {
    field1: 'Wassana-so@nbr.ac.th',
  },
  {
    field1: 'arorawan2543@gmail.com',
  },
  {
    field1: 'thapaneefoonf37@gmail.com',
  },
  {
    field1: 'Paphawarin.m@psru.ac.th',
  },
  {
    field1: 'Firstkab@gmail.com',
  },
  {
    field1: 'jamras122517@gmail.com',
  },
  {
    field1: '6441193427@student.chula.ac.th',
  },
  {
    field1: 'faiisut@gmail.com',
  },
  {
    field1: 'Rikchana@gmail.com',
  },
  {
    field1: 'preecha@kanta.ac.th',
  },
  {
    field1: 'nitchatandee@gmail.com',
  },
  {
    field1: 'o.rnon8964@gmail.com',
  },
  {
    field1: 'krittarmath.kb@gmail.com',
  },
  {
    field1: 'zolagive697@gmail.com',
  },
  {
    field1: 'suriya@ksw.ac.th',
  },
  {
    field1: 'nuja.pp23@gmail.com',
  },
  {
    field1: 'werasak.boon@gmail.com',
  },
  {
    field1: 'mangpor-pt@hotmail.com',
  },
  {
    field1: 'duangjai089845@gmail.com',
  },
  {
    field1: 'walailakjao.12@gmail.com',
  },
  {
    field1: 'naruemon@sy.ac.th',
  },
  {
    field1: 'narin@vru.ac.th',
  },
  {
    field1: 'wongvan.1993@gmail.com',
  },
  {
    field1: 'aekawat@psr.ac.th',
  },
  {
    field1: 'mr.otaro101@gmail.com',
  },
  {
    field1: 'saengdao@tesaban6.ac.th',
  },
  {
    field1: 'saranyoo1com@gmail.com',
  },
  {
    field1: 'yokiwongsathonwink@gmail.com',
  },
  {
    field1: 'thanyathep@ds.ac.th',
  },
  {
    field1: 'thanawut@nongki.ac.th',
  },
  {
    field1: 'natewee2023@gmail.com',
  },
  {
    field1: 'sumet@huaikrot.ac.th',
  },
  {
    field1: 'kruwaroot.boonchum@gmail.com',
  },
  {
    field1: '17082544mo@gmail.com',
  },
  {
    field1: 'pimkatika@gmail.com',
  },
  {
    field1: 'nuchnphaxanthaso@gmail.com',
  },
  {
    field1: 'pichawat.sop@gmail.com',
  },
  {
    field1: 'pupu0461@gmail.com',
  },
  {
    field1: '5681135017u@gmail.com',
  },
  {
    field1: 'imma16604@gmail.com',
  },
  {
    field1: 'maneesri.kat@gmail.com',
  },
  {
    field1: 'sutiwat.chanta@gmail.com',
  },
  {
    field1: 'dramahan26@gmail.com',
  },
  {
    field1: 'kittisak.pa007@gmail.com',
  },
  {
    field1: 'pathittapai@gmail.com',
  },
  {
    field1: 'maybe.infinite231@gmail.com',
  },
  {
    field1: 'santi.saesen@gmail.com',
  },
  {
    field1: 'booncharoen.gang@gmail.com',
  },
  {
    field1: 'tospornsukatip@gmail.com',
  },
  {
    field1: 'wichukorn.nu@bsru.ac.th',
  },
  {
    field1: 'phawadeesailad@gmail.com',
  },
  {
    field1: 'krutiwarat@gmail.com',
  },
  {
    field1: 'tiwakorn464210@gmail.com',
  },
  {
    field1: 'piyatida108108@gmail.com',
  },
  {
    field1: 'opiu.009@gmail.com',
  },
  {
    field1: 'mariyah07@gmail.com',
  },
  {
    field1: 'trbe_nipat@ratb.ac.th',
  },
  {
    field1: 'natcha.mon92@gmail.com',
  },
  {
    field1: 'jinnapatt2016@gmail.com',
  },
  {
    field1: 'chayananvunsen@gmail.com',
  },
  {
    field1: 'jutarutsongjantuk@gmail.com',
  },
  {
    field1: 'mamudpa@gmail.com',
  },
  {
    field1: 'yanee.cm@sisbschool.com',
  },
  {
    field1: 'ueayyy2546@gmail.com',
  },
  {
    field1: 'thitikarn.meemak@gmail.com',
  },
  {
    field1: 'Sirinsirintra2568@gmail.com',
  },
  {
    field1: 'tiwakorn464210@gmail.com',
  },
  {
    field1: 'marisaanantatho535@gmail.com',
  },
  {
    field1: 'djpasit1@gmail.com',
  },
  {
    field1: 'khamsawat140@gmail.com',
  },
  {
    field1: 'sakass74@gmail.com',
  },
  {
    field1: 'chayut201126@gmail.com',
  },
  {
    field1: 'pjuree@gmail.com',
  },
  {
    field1: 'wipawan4537@gmail.com',
  },
  {
    field1: 'adamcheuma2002@gmail.com',
  },
  {
    field1: 'phanpha226@gmail.com',
  },
  {
    field1: 'achangrue@gmail.com',
  },
  {
    field1: 'waruneesainuea2543@gmail.com',
  },
  {
    field1: 'panupong@maeon.ac.th',
  },
  {
    field1: 'moonuize@gmail.com',
  },
  {
    field1: 'ninyada2015@gmail.com',
  },
  {
    field1: 'pangpang7366@gmail.com',
  },
  {
    field1: 'jakkit@tcschool.ac.th',
  },
  {
    field1: 'workworkjar@gmail.com',
  },
  {
    field1: 'usa25621@gmail.com',
  },
  {
    field1: 'songengpsu@gmail.com',
  },
  {
    field1: 'wikanda.jha@gmail.com',
  },
  {
    field1: 'si.anesth.nurse@gmail.com',
  },
  {
    field1: 'yotinkaison@gmail.com',
  },
  {
    field1: 'paradee.junpen@gmail.com',
  },
  {
    field1: 'natcha.te@kmitl.ac.th',
  },
  {
    field1: 'natcup1@gmail.com',
  },
  {
    field1: 'pawarutgosayayotin@gmail.com',
  },
  {
    field1: 'phatsanai@kledlin.ac.th',
  },
  {
    field1: 'apiwatprechamat@gmail.com',
  },
  {
    field1: 'kanon@htp.ac.th',
  },
  {
    field1: 'watthanaa@satuk.ac.th',
  },
  {
    field1: 'speedfa4@gmail.com',
  },
  {
    field1: 'thanatep.ohm@gmail.com',
  },
  {
    field1: 'permlap@tatugacamp.com',
  },
  {
    field1: 'ploytitiworda.123@gmail.com',
  },
  {
    field1: 'phattraporn199942@gmail.com',
  },
  {
    field1: 'patthawaro.breeze@gmail.com',
  },
  {
    field1: 'ked2539.kk@gmail.com',
  },
  {
    field1: 'chatchanon.lt@phachi.ac.th',
  },
  {
    field1: 'narueporn8099@gmail.com',
  },
  {
    field1: '406528001@yru.ac.th',
  },
  {
    field1: 'duangruetai.04@gmail.com',
  },
  {
    field1: 'baihakee3239@gmail.com',
  },
  {
    field1: 'chaiyachote22@gmail.com',
  },
  {
    field1: 'sarawut@psrp.ac.th',
  },
  {
    field1: 'workjar605@gmail.com',
  },
  {
    field1: '640113189003@bru.ac.th',
  },
  {
    field1: 'teacherjaroon@gmail.com',
  },
  {
    field1: 'wattana@udontech.ac.th',
  },
  {
    field1: 'noored.nd2@gmail.com',
  },
  {
    field1: 'homsombatwisarut@gmail.com',
  },
  {
    field1: 'charoensriju@gmail.com',
  },
  {
    field1: 'homjanthornthep@gmail.com',
  },
  {
    field1: 'sawaphon.bas@gmail.com',
  },
  {
    field1: 'pumpeaow@gmail.com',
  },
  {
    field1: 'rusminingmaethalong@gmail.com',
  },
  {
    field1: 'walailakjao.13@gmail.com',
  },
  {
    field1: 'onanong201044@gmail.com',
  },
  {
    field1: 'kruyingnbac@gmail.com',
  },
  {
    field1: 'jaturongtreerat@gmail.com',
  },
  {
    field1: 'sujinda09101991@gmail.com',
  },
  {
    field1: 'nuinghatairat.29@gmail.com',
  },
  {
    field1: 'shansmww@gmail.com',
  },
];

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
        .setSubject(
          'เหมือนคุณครูจะลืมกรอก แบบสอบถามความพึงพอใจในการใช้งาน Tatuga School ที่ทางเราส่งไปก่อนหน้านี้',
        )
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
