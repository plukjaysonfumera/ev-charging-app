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

export default router;
