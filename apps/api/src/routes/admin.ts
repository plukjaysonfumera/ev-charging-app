import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole, ConnectorType, ChargingSpeed, PortStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/v1/admin/stations?firebaseUid=xxx
router.get('/stations', async (req: Request, res: Response) => {
  const { firebaseUid } = req.query;
  if (!firebaseUid || typeof firebaseUid !== 'string') {
    return res.status(400).json({ error: 'firebaseUid query param required' });
  }
  try {
    const stations = await prisma.station.findMany({
      where: { owner: { firebaseUid } },
      include: {
        _count: { select: { ports: true, sessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(stations);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch stations' });
  }
});

// POST /api/v1/admin/stations
router.post('/stations', async (req: Request, res: Response) => {
  const { name, address, city, province, latitude, longitude, networkName, firebaseUid } = req.body;
  if (!firebaseUid || !name || !address || !city || !province || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    let user = await prisma.user.findFirst({ where: { firebaseUid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid,
          email: `${firebaseUid}@admin.local`,
          displayName: 'Station Owner',
          role: UserRole.STATION_OWNER,
        },
      });
    }

    const id = `c${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
    await prisma.$executeRaw`
      INSERT INTO stations (id, owner_id, name, address, city, province, network_name, location, created_at, updated_at)
      VALUES (
        ${id},
        ${user.id},
        ${name},
        ${address},
        ${city},
        ${province},
        ${networkName || null},
        ST_MakePoint(${parseFloat(longitude)}::float, ${parseFloat(latitude)}::float)::geography,
        NOW(),
        NOW()
      )
    `;

    const station = await prisma.station.findUnique({ where: { id } });
    return res.status(201).json(station);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create station' });
  }
});

// PATCH /api/v1/admin/stations/:id
router.patch('/stations/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, address, status, networkName } = req.body;
  try {
    const station = await prisma.station.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(status !== undefined && { status }),
        ...(networkName !== undefined && { networkName }),
      },
    });
    return res.json(station);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update station' });
  }
});

// GET /api/v1/admin/stations/:id/ports
router.get('/stations/:id/ports', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const ports = await prisma.port.findMany({
      where: { stationId: id },
      orderBy: { portNumber: 'asc' },
    });
    return res.json(ports);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch ports' });
  }
});

// POST /api/v1/admin/stations/:id/ports
router.post('/stations/:id/ports', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { portNumber, connectorType, chargingSpeed, maxKw, pricePerKwh } = req.body;
  if (!portNumber || !connectorType || !chargingSpeed || maxKw == null || pricePerKwh == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const port = await prisma.port.create({
      data: {
        stationId: id,
        portNumber: String(portNumber),
        connectorType: connectorType as ConnectorType,
        chargingSpeed: chargingSpeed as ChargingSpeed,
        maxKw: parseFloat(maxKw),
        pricePerKwh: parseFloat(pricePerKwh),
      },
    });
    return res.status(201).json(port);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create port' });
  }
});

// PATCH /api/v1/admin/ports/:id
router.patch('/ports/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { pricePerKwh, status, maxKw } = req.body;
  try {
    const port = await prisma.port.update({
      where: { id },
      data: {
        ...(pricePerKwh !== undefined && { pricePerKwh: parseFloat(pricePerKwh) }),
        ...(status !== undefined && { status: status as PortStatus }),
        ...(maxKw !== undefined && { maxKw: parseFloat(maxKw) }),
      },
    });
    return res.json(port);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update port' });
  }
});

// DELETE /api/v1/admin/ports/:id
router.delete('/ports/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.port.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete port' });
  }
});

// GET /api/v1/admin/stations/:id/sessions
router.get('/stations/:id/sessions', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const sessions = await prisma.chargingSession.findMany({
      where: { stationId: id },
      include: {
        port: { select: { portNumber: true, connectorType: true } },
        user: { select: { displayName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json(sessions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/v1/admin/stations/:id/stats
router.get('/stations/:id/stats', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const sessions = await prisma.chargingSession.findMany({
      where: { stationId: id, status: 'COMPLETED' },
      select: { totalAmount: true, durationMinutes: true },
    });

    const totalSessions = sessions.length;
    const totalRevenue = sessions.reduce((sum: number, s) => sum + parseFloat(String(s.totalAmount ?? '0')), 0);
    const totalDuration = sessions.reduce((sum: number, s) => sum + (s.durationMinutes ?? 0), 0);
    const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

    return res.json({
      totalRevenue: totalRevenue.toFixed(2),
      totalSessions,
      avgDurationMinutes: Math.round(avgDuration),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/v1/admin/sync-ocm
// Triggers Open Charge Map sync for Philippines stations.
// Protected by a shared secret in the OCM_SYNC_SECRET env var.
router.post('/sync-ocm', async (req: Request, res: Response) => {
  const secret = process.env.OCM_SYNC_SECRET;
  if (secret && req.headers['x-sync-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Run sync in background — respond immediately
  res.json({ message: 'OCM sync started. Check server logs for progress.' });

  (async () => {
    const OCM_BASE = 'https://api.openchargemap.io/v3/poi/';
    const OCM_API_KEY = process.env.OCM_API_KEY || '';

    const CONNECTOR_MAP: Record<number, string> = {
      1: 'TYPE1', 25: 'TYPE2', 1038: 'TYPE2', 33: 'CCS1', 27: 'CCS2',
      2: 'CHADEMO', 30: 'GBAC', 26: 'GBACD', 1036: 'TESLA_S', 32: 'TESLA_S', 1039: 'NACS',
    };

    function mapChargingSpeed(conn: any): string {
      const lvl = conn.Level?.ID;
      const kw = conn.PowerKW ?? 0;
      if (lvl === 3 || kw >= 40) return 'DCFC';
      if (lvl === 2 || kw >= 3.7) return 'LEVEL2';
      return 'LEVEL1';
    }
    function estimatePrice(speed: string): number {
      return speed === 'DCFC' ? 16 : speed === 'LEVEL2' ? 12 : 8;
    }
    function genId(): string {
      return `c${Math.random().toString(36).slice(2, 11)}${Date.now().toString(36)}`;
    }

    let offset = 0; let created = 0; let skipped = 0;
    console.log('[OCM Sync] Starting PH station sync...');

    while (true) {
      const params = new URLSearchParams({
        output: 'json', countrycode: 'PH', maxresults: '100',
        startindex: String(offset), compact: 'false', verbose: 'false',
        statustypeid: '50',
        ...(OCM_API_KEY ? { key: OCM_API_KEY } : {}),
      });
      const batch: any[] = await fetch(`${OCM_BASE}?${params}`).then(r => r.json() as Promise<any[]>);
      if (!batch.length) break;

      for (const poi of batch) {
        try {
          const addr = poi.AddressInfo;
          if (!addr) { skipped++; continue; }
          const lat = parseFloat(addr.Latitude);
          const lng = parseFloat(addr.Longitude);
          if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }

          const near = await prisma.$queryRaw<any[]>`
            SELECT id FROM stations WHERE ST_DWithin(location, ST_MakePoint(${lng}::float,${lat}::float)::geography, 100) LIMIT 1
          `;
          if (near.length > 0) { skipped++; continue; }

          const ports: any[] = [];
          let pi = 1;
          for (const conn of (poi.Connections ?? [])) {
            const connector = CONNECTOR_MAP[conn.ConnectionType?.ID];
            if (!connector) continue;
            const speed = mapChargingSpeed(conn);
            const kw = conn.PowerKW ?? (speed === 'DCFC' ? 50 : 7.4);
            for (let q = 0; q < Math.min(conn.Quantity ?? 1, 4); q++) {
              ports.push({ number: `P${pi++}`, connector, speed, kw, price: estimatePrice(speed) });
            }
          }
          if (!ports.length) { skipped++; continue; }

          const province = /metro\s*manila|ncr/i.test(addr.StateOrProvince ?? '') ? 'Metro Manila' : (addr.StateOrProvince ?? addr.Town ?? 'Philippines');
          const stationId = genId();
          await prisma.$executeRaw`
            INSERT INTO stations (id, name, description, address, city, province, status, amenities, network_name, location, phone, website, photos, created_at, updated_at)
            VALUES (${stationId}, ${(addr.Title ?? 'Unknown').trim()}, ${`ocm:${poi.ID}`},
              ${[addr.AddressLine1, addr.AddressLine2].filter(Boolean).join(', ') || addr.Title},
              ${addr.Town ?? province}, ${province}, 'ACTIVE', ARRAY[]::text[],
              ${poi.OperatorInfo?.Title ?? null}, ST_MakePoint(${lng}::float,${lat}::float)::geography,
              ${addr.ContactTelephone1 ?? null}, ${addr.RelatedURL ?? poi.OperatorInfo?.WebsiteURL ?? null},
              ARRAY[]::text[], NOW(), NOW())
          `;
          for (let i = 0; i < ports.length; i++) {
            const p = ports[i];
            await prisma.$executeRaw`
              INSERT INTO ports (id, station_id, port_number, connector_type, charging_speed, max_kw, price_per_kwh, currency, status, created_at, updated_at)
              VALUES (${genId() + i}, ${stationId}, ${p.number}, ${p.connector}::"ConnectorType", ${p.speed}::"ChargingSpeed", ${p.kw}::float, ${p.price}::decimal, 'PHP', 'AVAILABLE', NOW(), NOW())
            `;
          }
          console.log(`[OCM Sync] + ${addr.Title} — ${addr.Town}`);
          created++;
        } catch (e: any) { console.error('[OCM Sync] Error:', e.message); }
      }

      if (batch.length < 100) break;
      offset += 100;
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`[OCM Sync] Done: ${created} created, ${skipped} skipped.`);
  })().catch(e => console.error('[OCM Sync] Fatal:', e.message));
});

export default router;
