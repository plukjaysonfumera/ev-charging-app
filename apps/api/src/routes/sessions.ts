import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { sendPushNotification } from '../lib/notifications';

const router = Router();

// GET /api/v1/sessions?firebaseUid=xxx
router.get('/', async (req, res) => {
  try {
    const { firebaseUid } = req.query;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

    const user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid as string },
    });

    if (!user) return res.json({ data: [] });

    const sessions = await prisma.chargingSession.findMany({
      where: { userId: user.id },
      include: {
        station: { select: { name: true, city: true, address: true } },
        port: { select: { connectorType: true, chargingSpeed: true, maxKw: true, pricePerKwh: true } },
        vehicle: { select: { make: true, model: true, year: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/v1/sessions — start a session
router.post('/', async (req, res) => {
  try {
    const { firebaseUid, displayName, email, stationId, portId } = req.body;

    if (!firebaseUid || !stationId || !portId) {
      return res.status(400).json({ error: 'firebaseUid, stationId, and portId are required' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          firebaseUid,
          email: email ?? `${firebaseUid}@unknown.com`,
          displayName: displayName ?? 'Anonymous',
        },
      });
    }

    // Check no active session exists for this user
    const activeSession = await prisma.chargingSession.findFirst({
      where: { userId: user.id, status: { in: ['INITIATED', 'CHARGING'] } },
    });
    if (activeSession) {
      return res.status(409).json({ error: 'You already have an active charging session.', sessionId: activeSession.id });
    }

    // Mark port as occupied
    await prisma.port.update({ where: { id: portId }, data: { status: 'OCCUPIED' } });

    const session = await prisma.chargingSession.create({
      data: {
        userId: user.id,
        stationId,
        portId,
        status: 'CHARGING',
        startedAt: new Date(),
      },
      include: {
        station: { select: { name: true, city: true } },
        port: { select: { connectorType: true, chargingSpeed: true, maxKw: true, pricePerKwh: true } },
      },
    });

    res.json({ data: session });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// PATCH /api/v1/sessions/:id/stop — stop a session
router.patch('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.chargingSession.findUnique({
      where: { id },
      include: { port: { select: { pricePerKwh: true, id: true } } },
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'COMPLETED') return res.status(400).json({ error: 'Session already completed' });

    const endedAt = new Date();
    const startedAt = session.startedAt ?? endedAt;
    const durationMinutes = Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 60000));

    // Simulate energy: ~80% of max kW efficiency, per hour
    const port = await prisma.port.findUnique({ where: { id: session.portId } });
    const maxKw = Number(port?.maxKw ?? 7.4);
    const energyKwh = parseFloat(((maxKw * 0.8 * durationMinutes) / 60).toFixed(3));
    const pricePerKwh = Number(session.port.pricePerKwh);
    const totalAmount = parseFloat((energyKwh * pricePerKwh).toFixed(2));

    const updated = await prisma.chargingSession.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        endedAt,
        durationMinutes,
        energyKwh,
        totalAmount,
        paymentStatus: 'PENDING',
      },
      include: {
        station: { select: { name: true, city: true } },
        port: { select: { connectorType: true, chargingSpeed: true, maxKw: true, pricePerKwh: true } },
      },
    });

    // Free up the port
    await prisma.port.update({ where: { id: session.portId }, data: { status: 'AVAILABLE' } });

    // Send push notification
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user?.expoPushToken) {
      await sendPushNotification({
        to: user.expoPushToken,
        title: '⚡ Charging Complete',
        body: `${energyKwh} kWh added in ${durationMinutes} min · ₱${totalAmount.toFixed(2)} due`,
        data: { sessionId: id, screen: 'History' },
      });
    }

    res.json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

export default router;
