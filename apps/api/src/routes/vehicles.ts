import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/v1/vehicles?firebaseUid=xxx
router.get('/', async (req, res) => {
  try {
    const { firebaseUid } = req.query;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

    const user = await prisma.user.findUnique({ where: { firebaseUid: firebaseUid as string } });
    if (!user) return res.json({ data: [] });

    const vehicles = await prisma.vehicle.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ data: vehicles });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// POST /api/v1/vehicles
router.post('/', async (req, res) => {
  try {
    const { firebaseUid, make, model, year, batteryKwh, rangKm, connectors, licensePlate } = req.body;
    if (!firebaseUid || !make || !model || !year) {
      return res.status(400).json({ error: 'firebaseUid, make, model, year are required' });
    }

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const count = await prisma.vehicle.count({ where: { userId: user.id } });

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        make, model,
        year: parseInt(year),
        batteryKwh: parseFloat(batteryKwh) || 0,
        rangKm: parseFloat(rangKm) || 0,
        connectors: connectors ?? [],
        licensePlate: licensePlate || null,
        isDefault: count === 0, // first vehicle is default
      },
    });

    res.json({ data: vehicle });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

// PATCH /api/v1/vehicles/:id/default
router.patch('/:id/default', async (req, res) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.body;

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Unset all defaults for this user
    await prisma.vehicle.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    // Set new default
    await prisma.vehicle.update({ where: { id }, data: { isDefault: true } });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to set default vehicle' });
  }
});

// DELETE /api/v1/vehicles/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;
