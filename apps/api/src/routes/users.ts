import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

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

// PATCH /api/v1/users/push-token
router.patch('/push-token', async (req, res) => {
  try {
    const { firebaseUid, expoPushToken } = req.body;
    if (!firebaseUid || !expoPushToken) {
      return res.status(400).json({ error: 'firebaseUid and expoPushToken are required' });
    }

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

export default router;
