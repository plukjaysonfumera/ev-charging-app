import 'dotenv/config';
import { prisma } from '../lib/prisma';

const stations = [
  {
    name: 'SM Mall of Asia EV Hub',
    address: 'SM Mall of Asia, Seaside Blvd',
    city: 'Pasay',
    province: 'Metro Manila',
    lng: 120.9822,
    lat: 14.5353,
    network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
  },
  {
    name: 'Ayala Malls Circuit EV Station',
    address: 'Circuit Makati, Hippodromo St',
    city: 'Makati',
    province: 'Metro Manila',
    lng: 121.0144,
    lat: 14.5567,
    network: 'ChargePoint',
    amenities: ['wifi', 'restroom', 'food'],
  },
  {
    name: 'BGC Uptown Mall Charging Hub',
    address: 'Uptown Mall, 36th St',
    city: 'Taguig',
    province: 'Metro Manila',
    lng: 121.0514,
    lat: 14.5491,
    network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
  },
  {
    name: 'Robinsons Galleria EV Station',
    address: 'Robinsons Galleria, EDSA corner Ortigas Ave',
    city: 'Quezon City',
    province: 'Metro Manila',
    lng: 121.0569,
    lat: 14.5858,
    network: null,
    amenities: ['wifi', 'restroom', 'food'],
  },
  {
    name: 'SM North EDSA Charging Point',
    address: 'SM City North EDSA, North Ave',
    city: 'Quezon City',
    province: 'Metro Manila',
    lng: 121.0331,
    lat: 14.6565,
    network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
  },
  {
    name: 'Greenbelt 5 EV Station',
    address: 'Greenbelt 5, Ayala Center',
    city: 'Makati',
    province: 'Metro Manila',
    lng: 121.0235,
    lat: 14.5513,
    network: 'ChargePoint',
    amenities: ['wifi', 'restroom', 'food'],
  },
];

async function main() {
  console.log('Seeding stations...');

  for (const s of stations) {
    // Check if already exists
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM stations WHERE name = ${s.name} LIMIT 1
    `;
    if (existing.length > 0) {
      console.log(`Skipping "${s.name}" — already exists`);
      continue;
    }

    await prisma.$executeRaw`
      INSERT INTO stations (
        id, name, address, city, province, status, amenities,
        network_name, location, photos, created_at, updated_at
      ) VALUES (
        gen_random_uuid(),
        ${s.name},
        ${s.address},
        ${s.city},
        ${s.province},
        'ACTIVE',
        ${s.amenities}::text[],
        ${s.network},
        ST_MakePoint(${s.lng}, ${s.lat})::geography,
        ARRAY[]::text[],
        NOW(),
        NOW()
      )
    `;
    console.log(`Created: ${s.name}`);
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
