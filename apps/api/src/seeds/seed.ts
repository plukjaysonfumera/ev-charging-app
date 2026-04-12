import 'dotenv/config';
import { prisma } from '../lib/prisma';

const stations = [
  // ─── EVRO Network ────────────────────────────────────────────────
  {
    name: 'SM Mall of Asia EV Hub',
    address: 'SM Mall of Asia, Seaside Blvd',
    city: 'Pasay', province: 'Metro Manila',
    lng: 120.9822, lat: 14.5353, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 16.00 },
      { number: 'A2', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
      { number: 'B2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'SM North EDSA Charging Hub',
    address: 'SM City North EDSA, North Ave',
    city: 'Quezon City', province: 'Metro Manila',
    lng: 121.0331, lat: 14.6565, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 16.00 },
      { number: 'A2', connector: 'CHADEMO', speed: 'DCFC', kw: 50, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'SM Megamall EV Station',
    address: 'SM Megamall, EDSA corner Julia Vargas Ave',
    city: 'Mandaluyong', province: 'Metro Manila',
    lng: 121.0566, lat: 14.5847, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 16.00 },
      { number: 'A2', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
      { number: 'B2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'SM Aura Premier Charging Station',
    address: 'SM Aura Premier, McKinley Pkwy',
    city: 'Taguig', province: 'Metro Manila',
    lng: 121.0521, lat: 14.5488, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
      { number: 'B2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'SM Southmall EV Charging Hub',
    address: 'SM Southmall, Alabang-Zapote Rd',
    city: 'Las Piñas', province: 'Metro Manila',
    lng: 120.9928, lat: 14.4401, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'SM Lanang Premier EV Station',
    address: 'SM Lanang Premier, J.P. Laurel Ave',
    city: 'Davao City', province: 'Davao del Sur',
    lng: 125.6362, lat: 7.1155, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 15.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 11.00 },
    ],
  },
  {
    name: 'SM City Cebu Charging Hub',
    address: 'SM City Cebu, North Reclamation Area',
    city: 'Cebu City', province: 'Cebu',
    lng: 123.9020, lat: 10.3186, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 15.00 },
      { number: 'A2', connector: 'CHADEMO', speed: 'DCFC', kw: 50, price: 15.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 11.00 },
    ],
  },

  // ─── ChargePoint PH ──────────────────────────────────────────────
  {
    name: 'Greenbelt 5 EV Station',
    address: 'Greenbelt 5, Ayala Center',
    city: 'Makati', province: 'Metro Manila',
    lng: 121.0235, lat: 14.5513, network: 'ChargePoint PH',
    amenities: ['wifi', 'restroom', 'food'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 18.00 },
      { number: 'A2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 14.00 },
      { number: 'A3', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 14.00 },
    ],
  },
  {
    name: 'Ayala Malls Circuit EV Station',
    address: 'Circuit Makati, Hippodromo St',
    city: 'Makati', province: 'Metro Manila',
    lng: 121.0144, lat: 14.5567, network: 'ChargePoint PH',
    amenities: ['wifi', 'restroom', 'food'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 18.00 },
      { number: 'A2', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 18.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 14.00 },
    ],
  },
  {
    name: 'Glorietta Mall EV Hub',
    address: 'Glorietta Mall, Ayala Center',
    city: 'Makati', province: 'Metro Manila',
    lng: 121.0175, lat: 14.5519, network: 'ChargePoint PH',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 18.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 14.00 },
      { number: 'B2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 14.00 },
    ],
  },
  {
    name: 'Ayala Malls Manila Bay EV Station',
    address: 'Ayala Malls Manila Bay, Diosdado Macapagal Blvd',
    city: 'Pasay', province: 'Metro Manila',
    lng: 120.9916, lat: 14.5219, network: 'ChargePoint PH',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 18.00 },
      { number: 'A2', connector: 'CHADEMO', speed: 'DCFC', kw: 50, price: 18.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 14.00 },
    ],
  },

  // ─── BGC / Taguig ─────────────────────────────────────────────────
  {
    name: 'BGC Uptown Mall Charging Hub',
    address: 'Uptown Mall, 36th St cor. 9th Ave',
    city: 'Taguig', province: 'Metro Manila',
    lng: 121.0514, lat: 14.5565, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 100, price: 17.00 },
      { number: 'A2', connector: 'CCS2', speed: 'DCFC', kw: 100, price: 17.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 13.00 },
      { number: 'B2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 13.00 },
    ],
  },
  {
    name: 'Net Park BGC EV Station',
    address: 'Net Park, 5th Ave corner 26th St',
    city: 'Taguig', province: 'Metro Manila',
    lng: 121.0480, lat: 14.5514, network: null,
    amenities: ['wifi', 'restroom'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 17.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 13.00 },
    ],
  },

  // ─── Shell Recharge ──────────────────────────────────────────────
  {
    name: 'Shell Recharge NLEX Meycauayan',
    address: 'Shell Station, NLEX Meycauayan',
    city: 'Meycauayan', province: 'Bulacan',
    lng: 120.9573, lat: 14.7335, network: 'Shell Recharge',
    amenities: ['restroom', 'food'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 19.00 },
      { number: 'A2', connector: 'CHADEMO', speed: 'DCFC', kw: 50, price: 19.00 },
    ],
  },
  {
    name: 'Shell Recharge SLEX Laguna',
    address: 'Shell Station, SLEX Sto. Tomas Exit',
    city: 'Sto. Tomas', province: 'Batangas',
    lng: 121.1354, lat: 14.1073, network: 'Shell Recharge',
    amenities: ['restroom', 'food'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 19.00 },
      { number: 'A2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 14.00 },
    ],
  },

  // ─── Other Metro Manila ──────────────────────────────────────────
  {
    name: 'Robinsons Galleria EV Station',
    address: 'Robinsons Galleria, EDSA corner Ortigas Ave',
    city: 'Quezon City', province: 'Metro Manila',
    lng: 121.0569, lat: 14.5858, network: null,
    amenities: ['wifi', 'restroom', 'food'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'Trinoma Mall Charging Station',
    address: 'TriNoma, EDSA cor. North Ave',
    city: 'Quezon City', province: 'Metro Manila',
    lng: 121.0325, lat: 14.6561, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
      { number: 'B2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'Evia Lifestyle Center EV Hub',
    address: 'Evia Lifestyle Center, Daang Hari Rd',
    city: 'Las Piñas', province: 'Metro Manila',
    lng: 121.0007, lat: 14.3697, network: 'ChargePoint PH',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 17.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 13.00 },
    ],
  },
  {
    name: 'Estancia Mall EV Charging',
    address: 'Estancia Mall, Capitol Commons',
    city: 'Pasig', province: 'Metro Manila',
    lng: 121.0781, lat: 14.5983, network: null,
    amenities: ['wifi', 'restroom', 'food'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 16.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 12.00 },
    ],
  },
  {
    name: 'Solaire Resort EV Station',
    address: 'Solaire Resort & Casino, Entertainment City',
    city: 'Parañaque', province: 'Metro Manila',
    lng: 120.9827, lat: 14.5135, network: null,
    amenities: ['wifi', 'restroom', 'food'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 20.00 },
      { number: 'A2', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 15.00 },
    ],
  },

  // ─── Outside Metro Manila ────────────────────────────────────────
  {
    name: 'SM City Clark EV Hub',
    address: 'SM City Clark, Manuel A. Roxas Hwy',
    city: 'Angeles City', province: 'Pampanga',
    lng: 120.5894, lat: 15.1901, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 15.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 11.00 },
    ],
  },
  {
    name: 'Ayala Center Cebu EV Station',
    address: 'Ayala Center Cebu, Archbishop Reyes Ave',
    city: 'Cebu City', province: 'Cebu',
    lng: 123.8985, lat: 10.3157, network: 'ChargePoint PH',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 60, price: 15.00 },
      { number: 'A2', connector: 'CHADEMO', speed: 'DCFC', kw: 50, price: 15.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 11.00 },
    ],
  },
  {
    name: 'Abreeza Mall EV Charging',
    address: 'Abreeza Mall, J.P. Laurel Ave',
    city: 'Davao City', province: 'Davao del Sur',
    lng: 125.6115, lat: 7.0731, network: 'EVRO',
    amenities: ['wifi', 'restroom', 'food', 'shopping'],
    ports: [
      { number: 'A1', connector: 'CCS2', speed: 'DCFC', kw: 50, price: 14.00 },
      { number: 'B1', connector: 'TYPE2', speed: 'LEVEL2', kw: 22, price: 10.00 },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding PH charging stations...\n');

  let created = 0;
  let skipped = 0;

  for (const s of stations) {
    const existing = await prisma.$queryRaw<any[]>`
      SELECT id FROM stations WHERE name = ${s.name} LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`⏭  Skipping "${s.name}" — already exists`);
      skipped++;
      continue;
    }

    // Generate a cuid-style ID
    const id = `c${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;

    await prisma.$executeRaw`
      INSERT INTO stations (
        id, name, address, city, province, status, amenities,
        network_name, location, photos, created_at, updated_at
      ) VALUES (
        ${id},
        ${s.name},
        ${s.address},
        ${s.city},
        ${s.province},
        'ACTIVE',
        ${s.amenities}::text[],
        ${s.network},
        ST_MakePoint(${s.lng}::float, ${s.lat}::float)::geography,
        ARRAY[]::text[],
        NOW(),
        NOW()
      )
    `;

    // Add ports
    for (let i = 0; i < s.ports.length; i++) {
      const p = s.ports[i];
      const portId = `c${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}${i}`;
      await prisma.$executeRaw`
        INSERT INTO ports (
          id, station_id, port_number, connector_type, charging_speed,
          max_kw, price_per_kwh, currency, status, created_at, updated_at
        ) VALUES (
          ${portId},
          ${id},
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

    console.log(`✅ Created: ${s.name} (${s.ports.length} ports)`);
    created++;
  }

  console.log(`\n🎉 Done! ${created} stations created, ${skipped} skipped.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
