/**
 * One-off export for the marketing team: verified users who have been
 * inactive since before the current month, as a Thai-language Excel file.
 *
 * Selection:
 *   - isVerifyEmail = true
 *   - lastActiveAt < first day of the month the script runs in
 *   - isDeleted is intentionally NOT filtered (marketing wants everyone)
 *
 * Run from servers/server-main-tatugaschool:
 *   bun run export:marketing              # uses .env
 *   bun run production:export:marketing   # uses .env.production
 * (Both output to the same file name — rename/move the file before running
 * against the other environment if you need to keep both.)
 *
 * Read-only — makes no database changes. Output is written next to this
 * script as scripts/inactive-users-<YYYY-MM>.xlsx.
 */
import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Human-readable Thai duration between two dates, e.g. "1 ปี 3 เดือน",
 * "2 เดือน", "15 วัน". Calendar-based whole months, rounded down.
 */
function formatDurationThai(from: Date, to: Date): string {
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months--;

  if (months < 1) {
    const days = Math.floor(
      (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000),
    );
    return `${Math.max(days, 0)} วัน`;
  }

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ปี`);
  if (remMonths > 0) parts.push(`${remMonths} เดือน`);
  return parts.join(' ');
}

async function main() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTag = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  console.log(
    `Selecting users with isVerifyEmail=true and lastActiveAt < ${startOfMonth.toISOString()}`,
  );

  const users = await prisma.user.findMany({
    where: {
      isVerifyEmail: true,
      lastActiveAt: { lt: startOfMonth },
    },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      lastActiveAt: true,
      createAt: true,
    },
    orderBy: { firstName: 'asc' },
  });

  console.log(`Found ${users.length} user(s).`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('รายชื่อผู้ใช้งาน');

  sheet.columns = [
    { header: 'ชื่อ', key: 'firstName', width: 25 },
    { header: 'นามสกุล', key: 'lastName', width: 25 },
    // Text format so leading zeros in Thai phone numbers survive Excel.
    { header: 'เบอร์โทรศัพท์', key: 'phone', width: 18, style: { numFmt: '@' } },
    { header: 'อีเมล', key: 'email', width: 35 },
    { header: 'สมัครเมื่อ', key: 'createdOn', width: 18 },
    { header: 'ใช้งานล่าสุด', key: 'lastActive', width: 18 },
    { header: 'ไม่ได้ใช้งานมาแล้ว', key: 'inactiveFor', width: 20 },
    { header: 'อยู่กับเรานาน', key: 'withUsFor', width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  const thaiDate = (d: Date) =>
    d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  for (const user of users) {
    sheet.addRow({
      ...user,
      createdOn: thaiDate(user.createAt),
      lastActive: thaiDate(user.lastActiveAt),
      inactiveFor: formatDurationThai(user.lastActiveAt, now),
      // Signup-to-last-activity: how long they used the product before
      // going quiet.
      withUsFor: formatDurationThai(user.createAt, user.lastActiveAt),
    });
  }

  const outPath = path.join(__dirname, `inactive-users-${monthTag}.xlsx`);
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${users.length} row(s) to ${outPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
