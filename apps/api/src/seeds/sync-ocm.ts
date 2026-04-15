/**
 * sync-ocm.ts
 * Fetches all EV charging stations in the Philippines from Open Charge Map
 * and upserts them into the local database.
 *
 * Usage: pnpm --filter api exec tsx src/seeds/sync-ocm.ts
 * Env:   OCM_API_KEY (optional but recommended — get free key at openchargemap.org/site/develop)
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

const OCM_BASE = 'https://api.openchargemap.io/v3/poi/';
const OCM_API_KEY = process.env.OCM_API_KEY || '';

// ─── Connector type mapping (OCM ID → our enum) ──────────────────────────────
const CONNECTOR_MAP: Record<number, string> = {
  1:    'TYPE1',    // J1772 (SAE)
  2:    'CHADEMO',  // CHAdeMO
  3:    'TYPE2',    // EVSE (generic AC — treat as Type 2)
  25:   'TYPE2',    // IEC 62196-2 (Mennekes)
  26:   'GBACD',    // GB/T DC
  27:   'CCS2',     // CCS Type 2 Combo
  30:   'GBAC',     // GB/T AC
  32:   'TESLA_S',  // Tesla Supercharger V2 (non-NACS)
  33:   'CCS1',     // CCS Type 1 Combo
  36:   'TYPE2',    // IEC 62196-3 DC (Type 2 variant)
  1036: 'TESLA_S',  // Tesla (proprietary plug)
  1037: 'TESLA_S',  // Tesla Supercharger V3
  1038: 'TYPE2',    // IEC 62196-2 socket only
  1039: 'NACS',     // NACS / J3400
};

function mapConnector(typeId: number | undefined): string | null {
  if (typeId == null) return null;
  return CONNECTOR_MAP[typeId] ?? null;
}

function mapChargingSpeed(connection: any): string {
  const levelId = connection.Level?.ID;
  const kw = connection.PowerKW ?? 0;
  // Level 3 = DC fast charge
  if (levelId === 3 || kw >= 40) return 'DCFC';
  // Level 2 = AC fast
  if (levelId === 2 || kw >= 3.7) return 'LEVEL2';
  return 'LEVEL1';
}

// Default price estimates (OCM doesn't carry PHP pricing)
function estimatePrice(speed: string): number {
  if (speed === 'DCFC')   return 16.00;
  if (speed === 'LEVEL2') return 12.00;
  return 8.00;
}

function parseProvince(stateOrProvince: string | undefined, town: string | undefined): string {
  // OCM sometimes puts Metro Manila cities under "Metro Manila" or "NCR"
  const raw = stateOrProvince ?? town ?? 'Philippines';
  if (/metro\s*manila|ncr|national\s*capital/i.test(raw)) return 'Metro Manila';
  return raw;
}

function generateId(): string {
  return `c${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

async function fetchOcmPage(offset: number, limit: number): Promise<any[]> {
  const params = new URLSearchParams({
    output: 'json',
    countrycode: 'PH',
    maxresults: String(limit),
    startindex: String(offset),
    compact: 'false',
    verbose: 'false',
    // Public access only — eliminates home chargers and private stations
    usagetypeid: '1',
    ...(OCM_API_KEY ? { key: OCM_API_KEY } : {}),
  });

  const url = `${OCM_BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OCM API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<any[]>;
}

async function stationExistsNear(lat: number, lng: number, ocmId: number): Promise<boolean> {
  // Skip if same OCM ID already imported
  const byId = await prisma.$queryRaw<any[]>`
    SELECT id FROM stations WHERE description = ${'ocm:' + ocmId} LIMIT 1
  `;
  if (byId.length > 0) return true;

  // Skip if another station is within 50 m (avoids true duplicates)
  const byProximity = await prisma.$queryRaw<any[]>`
    SELECT id FROM stations
    WHERE ST_DWithin(
      location,
      ST_MakePoint(${lng}::float, ${lat}::float)::geography,
      50
    )
    LIMIT 1
  `;
  return byProximity.length > 0;
}

async function syncOcm() {
  console.log('🌍 Fetching PH charging stations from Open Charge Map...\n');

  let offset = 0;
  const limit = 100;
  let totalFetched = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  while (true) {
    console.log(`  → Fetching stations ${offset + 1}–${offset + limit}...`);
    const batch = await fetchOcmPage(offset, limit);

    if (batch.length === 0) break;
    totalFetched += batch.length;

    for (const poi of batch) {
      try {
        const addr = poi.AddressInfo;
        if (!addr) { skipped++; continue; }

        const lat = parseFloat(addr.Latitude);
        const lng = parseFloat(addr.Longitude);
        if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }

        // Skip if already in DB (same OCM ID or within 50 m)
        if (await stationExistsNear(lat, lng, poi.ID)) {
          skipped++;
          continue;
        }

        const name = addr.Title?.trim() || 'Unknown Station';
        const address = [addr.AddressLine1, addr.AddressLine2].filter(Boolean).join(', ') || addr.Title;
        const city = addr.Town || addr.StateOrProvince || 'Philippines';
        const province = parseProvince(addr.StateOrProvince, addr.Town);
        const network = poi.OperatorInfo?.Title ?? null;
        const phone = addr.ContactTelephone1 ?? null;
        const website = addr.RelatedURL ?? poi.OperatorInfo?.WebsiteURL ?? null;

        // Store OCM ID in description for traceability
        const description = `ocm:${poi.ID}`;

        // Build ports from connections
        const connections: any[] = poi.Connections ?? [];
        const ports: { connector: string; speed: string; kw: number; price: number; number: string }[] = [];

        let portIndex = 1;
        for (const conn of connections) {
          const connector = mapConnector(conn.ConnectionType?.ID);
          if (!connector) continue;

          const speed = mapChargingSpeed(conn);
          const kw = conn.PowerKW ?? (speed === 'DCFC' ? 50 : speed === 'LEVEL2' ? 7.4 : 1.4);
          const qty = conn.Quantity ?? 1;

          for (let q = 0; q < Math.min(qty, 4); q++) {
            ports.push({
              number: `P${portIndex++}`,
              connector,
              speed,
              kw,
              price: estimatePrice(speed),
            });
          }
        }

        // Insert station (even if connector types couldn't be mapped —
        // the pin still appears on the map; port details shown when known)
        const stationId = generateId();
        await prisma.$executeRaw`
          INSERT INTO stations (
            id, name, description, address, city, province,
            status, amenities, network_name, location,
            phone, website, photos, created_at, updated_at
          ) VALUES (
            ${stationId},
            ${name},
            ${description},
            ${address},
            ${city},
            ${province},
            'ACTIVE',
            ARRAY[]::text[],
            ${network},
            ST_MakePoint(${lng}::float, ${lat}::float)::geography,
            ${phone},
            ${website},
            ARRAY[]::text[],
            NOW(),
            NOW()
          )
        `;

        // Insert ports
        for (let i = 0; i < ports.length; i++) {
          const p = ports[i];
          const portId = generateId() + i;
          await prisma.$executeRaw`
            INSERT INTO ports (
              id, station_id, port_number, connector_type, charging_speed,
              max_kw, price_per_kwh, currency, status, created_at, updated_at
            ) VALUES (
              ${portId},
              ${stationId},
              ${p.number},
              ${p.connector}::"ConnectorType",
              ${p.speed}::"ChargingSpeed",
              ${p.kw}::float,
              ${p.price}::decimal,
              'PHP',
              'AVAILABLE',
              NOW(),
              NOW()
            )
          `;
        }

        console.log(`  ✅ ${name} — ${city} (${ports.length} ports)`);
        created++;
      } catch (err: any) {
        console.error(`  ❌ Error: ${err.message}`);
        errors++;
      }
    }

    if (batch.length < limit) break;
    offset += limit;

    // Small delay to be respectful to the OCM API
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n🎉 OCM sync complete!`);
  console.log(`   Fetched : ${totalFetched} stations from OCM`);
  console.log(`   Created : ${created} new stations`);
  console.log(`   Skipped : ${skipped} (already exist or no valid data)`);
  console.log(`   Errors  : ${errors}`);
}

syncOcm()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
