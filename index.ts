import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const main = async () => {
  // --- 1. User Activity & Retention ---

  // Define the time period for "active"
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get counts for active and total users
  const totalUsers = await prisma.user.count({
    where: { isDeleted: false },
  });

  const activeUsersLastWeek = await prisma.user.count({
    where: {
      isDeleted: false,
      lastActiveAt: {
        gte: oneWeekAgo, // gte = greater than or equal to
      },
    },
  });

  const activeUserPercentage =
    totalUsers > 0 ? (activeUsersLastWeek / totalUsers) * 100 : 0;

  console.log('--- User Activity & Retention (Last 7 Days) ---');
  console.log(`Total Users: ${totalUsers}`);
  console.log(`Active Users: ${activeUsersLastWeek}`);
  console.log(`Active User Percentage: ${activeUserPercentage.toFixed(2)}%`);
  console.log('--------------------------------------------------\n');

  // --- 2. New User Registration Trends ---
  const newUsersLastWeek = await prisma.user.count({
    where: {
      isDeleted: false,
      createAt: {
        gte: oneWeekAgo,
      },
    },
  });

  console.log('--- User Growth ---');
  console.log(
    `New users who signed up in the last 7 days: ${newUsersLastWeek}`,
  );
  console.log('-------------------\n');

  // --- 3. User Demographics & Preferences ---

  // Breakdown by authentication provider (Google vs. Local)
  const providerDistribution = await prisma.user.groupBy({
    by: ['provider'],
    _count: {
      provider: true,
    },
    where: { isDeleted: false },
  });

  console.log('--- User Demographics ---');
  console.log('Distribution by Sign-up Provider:', providerDistribution);
  console.log('-------------------------\n');

  // --- 4. Account Status ---

  const unverifiedUsers = await prisma.user.count({
    where: {
      isDeleted: false,
      isVerifyEmail: false,
    },
  });

  const unverifiedPercentage =
    totalUsers > 0 ? (unverifiedUsers / totalUsers) * 100 : 0;

  console.log('--- Account Status ---');
  console.log(
    `Users with unverified emails: ${unverifiedUsers} (${unverifiedPercentage.toFixed(2)}%)`,
  );
  console.log('----------------------\n');

  // --- 5. User Feedback Analysis ---

  const feedbackByTag = await prisma.feedback.groupBy({
    by: ['tag'],
    _count: {
      tag: true,
    },
  });

  console.log('--- User Feedback ---');
  console.log('Breakdown of feedback by tag:', feedbackByTag);
  console.log('---------------------\n');
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
