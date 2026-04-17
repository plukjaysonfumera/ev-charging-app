/**
 * ocm-inspect.ts — shows raw OCM connector type IDs used in PH data
 * so we can verify our CONNECTOR_MAP is correct.
 *
 * Usage: railway run pnpm exec tsx src/seeds/ocm-inspect.ts
 */
import 'dotenv/config';

const OCM_API_KEY = process.env.OCM_API_KEY || '';

async function main() {
  const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=PH`
    + `&maxresults=1000&compact=false&verbose=false`
    + `&usagetypeid=1,4,5,6`
    + (OCM_API_KEY ? `&key=${OCM_API_KEY}` : '');

  console.log('🌍 Fetching PH OCM data...');
  const res = await fetch(url);
  const pois: any[] = await res.json();
  console.log(`✅ Got ${pois.length} stations\n`);

  // Tally connector type IDs
  const tally = new Map<number, { title: string; count: number; exampleKw: number[] }>();

  for (const poi of pois) {
    for (const conn of (poi.Connections ?? [])) {
      const id    = conn.ConnectionType?.ID;
      const title = conn.ConnectionType?.Title ?? '(no title)';
      const kw    = conn.PowerKW ?? 0;
      if (id == null) continue;
      const entry = tally.get(id) ?? { title, count: 0, exampleKw: [] };
      entry.count++;
      if (entry.exampleKw.length < 5 && kw > 0) entry.exampleKw.push(kw);
      tally.set(id, entry);
    }
  }

  console.log('OCM Connector Type ID breakdown for Philippines:');
  console.log('─'.repeat(70));
  [...tally.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([id, { title, count, exampleKw }]) => {
      const kws = exampleKw.length ? `  kW samples: ${exampleKw.join(', ')}` : '';
      console.log(`  ID ${String(id).padEnd(5)}  ${String(count).padEnd(5)}  ${title}${kws}`);
    });
}

main().catch(console.error);
