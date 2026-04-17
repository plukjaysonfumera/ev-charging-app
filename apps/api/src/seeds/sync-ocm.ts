/**
 * sync-ocm.ts — fetches PH public EV stations from Open Charge Map in one
 * request and bulk-inserts them, skipping any already in the DB.
 *
 * Usage: railway run --service api pnpm exec tsx src/seeds/sync-ocm.ts
 */
import 'dotenv/config';
import { prisma } from '../lib/prisma';

const OCM_API_KEY = process.env.OCM_API_KEY || '';

const CONNECTOR_MAP: Record<number, string> = {
  1:    'TYPE1',     // J1772 Type 1 AC
  2:    'CHADEMO',   // CHAdeMO DC
  3:    'TYPE2',     // IEC 62196 Type 2 AC
  25:   'TYPE2',     // IEC 62196 Type 2 (Socket Only)
  26:   'CCS2',      // IEC 62196 Type 2 CCS (Combo 2) DC
  27:   'TESLA_S',   // Tesla Roadster (legacy)
  28:   'GBAC',      // GB/T AC (China standard)
  29:   'GBACD',     // GB/T DC (China standard)
  30:   'TESLA_S',   // Tesla Model S/X
  32:   'TESLA_S',   // Tesla Model S/X (non-CHAdeMO)
  33:   'CCS2',      // CCS (Type 2) / Combo 2 DC — confirmed by PH data (60–120 kW)
  36:   'TYPE2',     // IEC 62196 Type 2 (with cable)
  1036: 'TYPE2',     // Type 2 (Tethered Connector) — most common in PH (7–22 kW)
  1037: 'TYPE2',     // Type 2 variant
  1038: 'TYPE2',     // Type 2 variant
  1039: 'GBAC',      // GB-T AC — GB/T 20234.2 (Tethered) — confirmed by PH data
  1040: 'GBACD',     // GB-T DC — GB/T 20234.3
};

function mapConnector(typeId: number | undefined): string | null {
  if (typeId == null) return null;
  return CONNECTOR_MAP[typeId] ?? null;
}

function mapChargingSpeed(conn: any): string {
  const levelId = conn.Level?.ID;
  const kw = conn.PowerKW ?? 0;
  if (levelId === 3 || kw >= 40) return 'DCFC';
  if (levelId === 2 || kw >= 3.7) return 'LEVEL2';
  return 'LEVEL1';
}

// Parse the first PHP/kWh number from OCM's UsageCost string
// e.g. "DC: ₱35/kWh. AC: ₱28.50/kWh" → for DCFC returns 35, for others 28.50
// e.g. "₱28.50/kWh" → 28.50
// Returns 0 if no price found
function parsePriceFromUsageCost(usageCost: string | null | undefined, speed: string): number {
  if (!usageCost) return 0;
  // Try to find DC price for DCFC ports
  if (speed === 'DCFC') {
    const dcMatch = usageCost.match(/DC[^₱]*[₱P]([\d.]+)/i);
    if (dcMatch) return parseFloat(dcMatch[1]);
  }
  // Try to find AC price for non-DCFC ports
  if (speed !== 'DCFC') {
    const acMatch = usageCost.match(/AC[^₱]*[₱P]([\d.]+)/i);
    if (acMatch) return parseFloat(acMatch[1]);
  }
  // Fall back to first number found
  const anyMatch = usageCost.match(/[₱P]([\d.]+)/);
  if (anyMatch) return parseFloat(anyMatch[1]);
  return 0;
}

function parseProvince(stateOrProvince?: string, town?: string): string {
  const raw = stateOrProvince ?? town ?? 'Philippines';
  if (/metro\s*manila|ncr|national\s*capital/i.test(raw)) return 'Metro Manila';
  return raw;
}

function generateId(): string {
  return `c${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
}

async function syncOcm() {
  console.log('🌍 Fetching PH public charging stations from Open Charge Map...');

  // Single request — usagetypeid as literal commas (not URL-encoded)
  const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=PH`
    + `&maxresults=1000&compact=false&verbose=false`
    + `&usagetypeid=1,4,5,6`
    + (OCM_API_KEY ? `&key=${OCM_API_KEY}` : '');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OCM API error: ${res.status}`);
  const pois: any[] = await res.json();
  console.log(`✅ Received ${pois.length} stations from OCM\n`);

  // Load all existing OCM IDs from DB in one query
  const existing = await prisma.$queryRaw<{ description: string }[]>`
    SELECT description FROM stations WHERE description LIKE 'ocm:%'
  `;
  // Extract just the ocm:ID part (description may be "ocm:123|usagecost text")
  const existingIds = new Set(existing.map(r => r.description.split('|')[0]));

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const poi of pois) {
    try {
      const addr = poi.AddressInfo;
      if (!addr) { skipped++; continue; }

      const lat = parseFloat(addr.Latitude);
      const lng = parseFloat(addr.Longitude);
      if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }

      const ocmKey = `ocm:${poi.ID}`;
      if (existingIds.has(ocmKey)) { skipped++; continue; }

      const name    = addr.Title?.trim() || 'Unknown Station';
      const address = [addr.AddressLine1, addr.AddressLine2].filter(Boolean).join(', ') || addr.Title;
      const city    = addr.Town || addr.StateOrProvince || 'Philippines';
      const province = parseProvince(addr.StateOrProvince, addr.Town);
      const network    = poi.OperatorInfo?.Title ?? null;
      const phone      = addr.ContactTelephone1 ?? null;
      const website    = addr.RelatedURL ?? poi.OperatorInfo?.WebsiteURL ?? null;
      const usageCost  = poi.UsageCost ?? null;

      const connections: any[] = poi.Connections ?? [];
      const ports: { connector: string; speed: string; kw: number; price: number; number: string }[] = [];
      let portIndex = 1;

      for (const conn of connections) {
        const connector = mapConnector(conn.ConnectionType?.ID);
        if (!connector) continue;
        const speed = mapChargingSpeed(conn);
        const kw    = conn.PowerKW ?? (speed === 'DCFC' ? 50 : speed === 'LEVEL2' ? 7.4 : 1.4);
        const qty   = conn.Quantity ?? 1;
        const price = parsePriceFromUsageCost(usageCost, speed);
        for (let q = 0; q < Math.min(qty, 4); q++) {
          ports.push({ number: `P${portIndex++}`, connector, speed, kw, price });
        }
      }

      // Store OCM ID + usage cost text in description for reference
      const description = usageCost ? `${ocmKey}|${usageCost}` : ocmKey;

      const stationId = generateId();
      await prisma.$executeRaw`
        INSERT INTO stations (
          id, name, description, address, city, province,
          status, amenities, network_name, location,
          phone, website, photos, created_at, updated_at
        ) VALUES (
          ${stationId}, ${name}, ${description}, ${address}, ${city}, ${province},
          'ACTIVE', ARRAY[]::text[], ${network},
          ST_MakePoint(${lng}::float, ${lat}::float)::geography,
          ${phone}, ${website}, ARRAY[]::text[], NOW(), NOW()
        )
      `;

      for (let i = 0; i < ports.length; i++) {
        const p = ports[i];
        await prisma.$executeRaw`
          INSERT INTO ports (
            id, station_id, port_number, connector_type, charging_speed,
            max_kw, price_per_kwh, currency, status, created_at, updated_at
          ) VALUES (
            ${generateId() + i}, ${stationId}, ${p.number},
            ${p.connector}::"ConnectorType", ${p.speed}::"ChargingSpeed",
            ${p.kw}::float, ${p.price}::decimal, 'PHP', 'AVAILABLE', NOW(), NOW()
          )
        `;
      }

      console.log(`  ✅ ${name} — ${city} (${ports.length} ports)`);
      created++;
    } catch (err: any) {
      console.error(`  ❌ ${err.message}`);
      errors++;
    }
  }

  console.log(`\n🎉 Done!  Created: ${created}  Skipped: ${skipped}  Errors: ${errors}`);
}

syncOcm()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
