/**
 * One-time backfill: downgrade schools whose CURRENT Stripe subscription is
 * already past_due. The new `customer.subscription.updated` webhook case only
 * catches transitions from now on — schools that went past_due before it was
 * deployed are stuck on a paid plan until Stripe cancels the subscription.
 *
 * Mirrors the webhook path exactly: same status check, school looked up by its
 * own stripe_subscription_id, and the same downgrade side effects as
 * SchoolService.upgradePlanFree (FREE limits, Stripe fields nulled, subjects
 * and classrooms beyond the first 3 locked). The subscription itself is NOT
 * cancelled — if the customer pays the open invoice later, the invoice.paid
 * webhook re-promotes the school.
 *
 * Run (dry-run, default — prints what it would do, changes nothing):
 *   bun run scripts/downgrade-past-due-schools.ts
 * Apply for real:
 *   bun run scripts/downgrade-past-due-schools.ts --apply
 * Also downgrade schools whose subscription no longer exists in Stripe
 * (a missed customer.subscription.deleted webhook):
 *   bun run scripts/downgrade-past-due-schools.ts --apply --include-missing
 *
 * Idempotent: a school already on FREE (or with no subscription id) is never
 * selected, so re-running is safe.
 */
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10',
});

const APPLY = process.argv.includes('--apply');
const INCLUDE_MISSING = process.argv.includes('--include-missing');

/** Same effects as SchoolService.upgradePlanFree, without booting Nest. */
async function downgradeToFree(schoolId: string): Promise<void> {
  await prisma.school.update({
    where: { id: schoolId },
    data: {
      plan: 'FREE',
      limitSchoolMember: 2,
      limitClassNumber: 3,
      stripe_subscription_id: null,
      stripe_subscription_expireAt: null,
      stripe_price_id: null,
      limitSubjectNumber: 3,
      limitTotalStorage: 16106127360,
    },
  });

  const [subjects, classrooms] = await Promise.all([
    prisma.subject.findMany({ where: { schoolId } }),
    prisma.class.findMany({ where: { schoolId } }),
  ]);

  await Promise.all([
    ...subjects.slice(3).map((s) =>
      prisma.subject.update({
        where: { id: s.id },
        data: { isLocked: true },
      }),
    ),
    ...classrooms.slice(3).map((c) =>
      prisma.class.update({
        where: { id: c.id },
        data: { isLocked: true },
      }),
    ),
  ]);
}

async function main() {
  console.log(
    APPLY ? '=== APPLY mode — changes WILL be made ===' : '=== DRY RUN — no changes (pass --apply to execute) ===',
  );

  // plan is a required field, so this filter stays index-friendly; the
  // optional stripe_subscription_id is checked in JS to sidestep the
  // Mongo missing-vs-null filter trap.
  const paidSchools = await prisma.school.findMany({
    where: { plan: { in: ['BASIC', 'PREMIUM', 'ENTERPRISE'] } },
  });
  const withSub = paidSchools.filter((s) => s.stripe_subscription_id);
  console.log(
    `Found ${paidSchools.length} paid school(s), ${withSub.length} with a subscription id.`,
  );

  let pastDue = 0;
  let missing = 0;
  let downgraded = 0;

  for (const school of withSub) {
    const subId = school.stripe_subscription_id as string;
    let status: string;
    try {
      const subscription = await stripe.subscriptions.retrieve(subId);
      status = subscription.status;
    } catch (error) {
      const code = (error as Stripe.errors.StripeError)?.code;
      if (code === 'resource_missing') {
        missing++;
        console.log(
          `[missing]  school ${school.id} (${school.title}) — subscription ${subId} not found in Stripe (missed deleted webhook?)${INCLUDE_MISSING ? '' : ' — skipped; use --include-missing to downgrade'}`,
        );
        if (INCLUDE_MISSING && APPLY) {
          await downgradeToFree(school.id);
          downgraded++;
          console.log(`           -> downgraded to FREE`);
        }
        continue;
      }
      throw error;
    }

    if (status !== 'past_due') {
      console.log(
        `[${status}]  school ${school.id} (${school.title}) — no action`,
      );
      continue;
    }

    pastDue++;
    console.log(
      `[past_due] school ${school.id} (${school.title}) plan=${school.plan} expireAt=${school.stripe_subscription_expireAt?.toISOString() ?? 'null'}`,
    );
    if (APPLY) {
      await downgradeToFree(school.id);
      downgraded++;
      console.log(`           -> downgraded to FREE`);
    }
  }

  console.log(
    `\nSummary: past_due=${pastDue}, missing-in-stripe=${missing}, downgraded=${downgraded}${APPLY ? '' : ' (dry run — nothing changed)'}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
