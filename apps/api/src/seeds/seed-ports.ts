import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main() {
  const stations = await prisma.station.findMany({ select: { id: true, name: true } });
  console.log(`Found ${stations.length} stations`);

  for (const station of stations) {
    const existing = await prisma.port.count({ where: { stationId: station.id } });
    if (existing > 0) { console.log(`Skipping ${station.name}`); continue; }

    await prisma.port.createMany({
      data: [
        {
          stationId: station.id, portNumber: '1',
          connectorType: 'CCS2', chargingSpeed: 'DCFC',
          maxKw: 50, pricePerKwh: 12.5, status: 'AVAILABLE',
        },
        {
          stationId: station.id, portNumber: '2',
          connectorType: 'TYPE2', chargingSpeed: 'LEVEL2',
          maxKw: 22, pricePerKwh: 10.0, status: 'AVAILABLE',
        },
      ],
    });
    console.log(`Added ports to: ${station.name}`);
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
