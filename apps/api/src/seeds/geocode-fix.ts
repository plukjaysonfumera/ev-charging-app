/**
 * geocode-fix.ts
 * Re-geocodes all stations using Nominatim (OpenStreetMap) and updates
 * coordinates where the result differs from the stored location by more
 * than the threshold (default: 500 m).
 *
 * Usage:
 *   pnpm --filter api exec tsx src/seeds/geocode-fix.ts
 *   pnpm --filter api exec tsx src/seeds/geocode-fix.ts --dry-run
 *
 * Nominatim ToS: 1 req/s max, must send a User-Agent.
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

const DRY_RUN = process.argv.includes('--dry-run');
const THRESHOLD_METERS = 500;    // only update if new coords differ by more than this
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'PHEVPH-geocode-fix/1.0 (phevph-app)';

// Haversine distance in metres
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocode(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const q = [address, city, 'Philippines'].join(', ');
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ph`;

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;

  const results: any[] = await res.json();
  if (!results.length) return null;

  const hit = results[0];
  const lat = parseFloat(hit.lat);
  const lng = parseFloat(hit.lon);
  if (isNaN(lat) || isNaN(lng)) return null;

  return { lat, lng };
}

async function main() {
  console.log(`🔎 Geocode-fix — ${DRY_RUN ? 'DRY RUN' : 'LIVE'} (threshold: ${THRESHOLD_METERS}m)\n`);

  const stations = await prisma.$queryRaw<any[]>`
    SELECT id, name, address, city,
           ST_Y(location::geometry) AS latitude,
           ST_X(location::geometry) AS longitude
    FROM stations
    WHERE status = 'ACTIVE'
    ORDER BY name ASC
  `;

  console.log(`Found ${stations.length} stations to check.\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;

  for (const s of stations) {
    const storedLat = Number(s.latitude);
    const storedLng = Number(s.longitude);

    let geo: { lat: number; lng: number } | null = null;
    try {
      geo = await geocode(s.address, s.city);
    } catch (err: any) {
      console.error(`  ❌ ${s.name}: ${err.message}`);
      errors++;
      await sleep(1100);
      continue;
    }

    if (!geo) {
      console.log(`  ⚠️  ${s.name} — not found in Nominatim, skipping`);
      notFound++;
      await sleep(1100);
      continue;
    }

    const dist = haversineMeters(storedLat, storedLng, geo.lat, geo.lng);

    if (dist < THRESHOLD_METERS) {
      skipped++;
      await sleep(1100);
      continue;
    }

    console.log(
      `  📍 ${s.name} (${s.city})\n` +
      `     was  : ${storedLat.toFixed(6)}, ${storedLng.toFixed(6)}\n` +
      `     new  : ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}\n` +
      `     delta: ${Math.round(dist)}m`
    );

    if (!DRY_RUN) {
      await prisma.$executeRaw`
        UPDATE stations
        SET location = ST_MakePoint(${geo.lng}::float, ${geo.lat}::float)::geography,
            updated_at = NOW()
        WHERE id = ${s.id}
      `;
    }

    updated++;
    await sleep(1100); // Nominatim 1 req/s limit
  }

  console.log(`\n✅ Done!`);
  console.log(`   Updated  : ${updated}`);
  console.log(`   Within threshold (${THRESHOLD_METERS}m, kept) : ${skipped}`);
  console.log(`   Not found in Nominatim : ${notFound}`);
  console.log(`   Errors   : ${errors}`);
  if (DRY_RUN) console.log(`\n(Dry run — no changes written. Re-run without --dry-run to apply.)`);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
