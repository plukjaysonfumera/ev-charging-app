/**
 * reset-and-resync.ts
 * 1. Deletes all seeded placeholder stations (those without an OCM ID in their
 *    description), which have AI-generated / inaccurate coordinates.
 * 2. Prints a count so you can verify before the OCM re-sync overwrites them
 *    with accurate data.
 *
 * Run BEFORE sync-ocm.ts:
 *   railway run --service api pnpm exec tsx src/seeds/reset-and-resync.ts
 *   railway run --service api pnpm exec tsx src/seeds/sync-ocm.ts
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  const seeded = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM stations
    WHERE description IS NULL OR description NOT LIKE 'ocm:%'
  `;
  const count = Number(seeded[0].count);
  console.log(`🗑  Deleting ${count} seeded placeholder station(s)…`);

  await prisma.$executeRaw`
    DELETE FROM stations
    WHERE description IS NULL OR description NOT LIKE 'ocm:%'
  `;

  const remaining = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count FROM stations
  `;
  console.log(`✅ Done. ${Number(remaining[0].count)} OCM stations remain.`);
  console.log(`\nNow run the OCM sync to re-import everything with accurate coordinates:`);
  console.log(`  railway run --service api pnpm exec tsx src/seeds/sync-ocm.ts`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
