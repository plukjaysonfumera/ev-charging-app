import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/v1/users/profile?firebaseUid=xxx
router.get('/profile', async (req, res) => {
  try {
    const { firebaseUid } = req.query;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

    const user = await prisma.user.findUnique({
      where: { firebaseUid: firebaseUid as string },
      select: { id: true, displayName: true, email: true, phoneNumber: true, role: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/v1/users/profile
router.patch('/profile', async (req, res) => {
  try {
    const { firebaseUid, displayName, phoneNumber } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({
      where: { firebaseUid },
      data: {
        ...(displayName && { displayName }),
        ...(phoneNumber !== undefined && { phoneNumber }),
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/v1/users/register
// Called immediately after Firebase registration to ensure a DB record exists.
router.post('/register', async (req, res) => {
  try {
    const { firebaseUid, email, displayName } = req.body;
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'firebaseUid and email are required' });
    }

    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: { displayName: displayName ?? undefined },
      create: { firebaseUid, email, displayName: displayName ?? 'EV Driver' },
    });

    res.json({ data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// PATCH /api/v1/users/push-token
router.patch('/push-token', async (req, res) => {
  try {
    const { firebaseUid, expoPushToken } = req.body;
    if (!firebaseUid || !expoPushToken) {
      return res.status(400).json({ error: 'firebaseUid and expoPushToken are required' });
    }

    // Tolerate users who haven't been registered yet (e.g. Google Sign-In flow)
    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.user.update({
      where: { firebaseUid },
      data: { expoPushToken },
    });

    res.json({ data: { success: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

// DELETE /api/v1/users/account
// Permanently deletes the user and all their data (vehicles, sessions, reviews cascade).
router.delete('/account', async (req, res) => {
  try {
    const { firebaseUid } = req.body;
    if (!firebaseUid) return res.status(400).json({ error: 'firebaseUid is required' });

    const user = await prisma.user.findUnique({ where: { firebaseUid } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.user.delete({ where: { firebaseUid } });
    res.json({ data: { success: true } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
