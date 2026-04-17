/**
 * fix-ccs2.ts — one-shot repair for the OCM connector-type mapping bug.
 *
 * The original sync-ocm.ts had OCM IDs 26 and 27 swapped:
 *   26 → 'GBACD'  (wrong, should be CCS2)
 *   27 → 'CCS2'   (wrong, should be TESLA_S / legacy Roadster)
 *
 * This script:
 *   1. Renames any 'TESLA_S' ports that were wrongly created from OCM-27 back to TESLA_S (already correct enum value, no change needed)
 *   2. Renames all 'GBACD' ports → 'CCS2'  (the real fix)
 *   3. Shows a before/after count so you can confirm it worked.
 *
 * Usage:
 *   railway run --service api pnpm exec tsx src/seeds/fix-ccs2.ts
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  // ── Before ────────────────────────────────────────────────────────────────
  const before = await prisma.$queryRaw<{ connector_type: string; cnt: bigint }[]>`
    SELECT connector_type::text, COUNT(*) AS cnt
    FROM   ports
    GROUP  BY connector_type
    ORDER  BY cnt DESC
  `;
  console.log('\n📊 Port counts BEFORE fix:');
  before.forEach(r => console.log(`   ${r.connector_type.padEnd(12)} ${r.cnt}`));

  // ── Fix 1: CCS1 → CCS2  (OCM ID 33 = "CCS Type 2" / Combo 2, not Combo 1) ──
  const fix1 = await prisma.$executeRaw`
    UPDATE ports
    SET    connector_type = 'CCS2'::"ConnectorType",
           updated_at     = NOW()
    WHERE  connector_type = 'CCS1'::"ConnectorType"
  `;
  console.log(`✅ Updated ${fix1} ports: CCS1  → CCS2`);

  // ── Fix 2: TESLA_S → TYPE2  (OCM ID 1036 = Type 2 Tethered, not Tesla) ───
  const fix2 = await prisma.$executeRaw`
    UPDATE ports
    SET    connector_type = 'TYPE2'::"ConnectorType",
           updated_at     = NOW()
    WHERE  connector_type = 'TESLA_S'::"ConnectorType"
  `;
  console.log(`✅ Updated ${fix2} ports: TESLA_S → TYPE2`);

  // ── Fix 3: NACS → GBAC  (OCM ID 1039 = GB-T AC, not NACS) ──────────────
  const fix3 = await prisma.$executeRaw`
    UPDATE ports
    SET    connector_type = 'GBAC'::"ConnectorType",
           updated_at     = NOW()
    WHERE  connector_type = 'NACS'::"ConnectorType"
  `;
  console.log(`✅ Updated ${fix3} ports: NACS → GBAC`);

  // ── After ─────────────────────────────────────────────────────────────────
  const after = await prisma.$queryRaw<{ connector_type: string; cnt: bigint }[]>`
    SELECT connector_type::text, COUNT(*) AS cnt
    FROM   ports
    GROUP  BY connector_type
    ORDER  BY cnt DESC
  `;
  console.log('\n📊 Port counts AFTER fix:');
  after.forEach(r => console.log(`   ${r.connector_type.padEnd(12)} ${r.cnt}`));

  console.log('\n🎉 Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
