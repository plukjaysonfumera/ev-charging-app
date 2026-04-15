/**
 * reset-and-resync.ts
 * Wipes ALL stations (and their dependent rows) that have no user reviews,
 * then prints how many remain so you can verify before re-syncing from OCM.
 *
 * Usage:
 *   railway run --service api pnpm exec tsx src/seeds/reset-and-resync.ts
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  // Stations with no reviews attached — safe to wipe
  const { count } = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM stations
    WHERE id NOT IN (SELECT DISTINCT station_id FROM reviews)
  `.then(r => r[0]);

  console.log(`🗑  Deleting ${Number(count)} stations with no reviews…`);

  // Remove dependent rows first
  await prisma.$executeRaw`
    DELETE FROM charging_sessions
    WHERE station_id IN (
      SELECT id FROM stations
      WHERE id NOT IN (SELECT DISTINCT station_id FROM reviews)
    )
  `;

  await prisma.$executeRaw`
    DELETE FROM stations
    WHERE id NOT IN (SELECT DISTINCT station_id FROM reviews)
  `;

  const remaining = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS count FROM stations
  `;
  console.log(`✅ Done. ${Number(remaining[0].count)} station(s) kept (have user reviews).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
