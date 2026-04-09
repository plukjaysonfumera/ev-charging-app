import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/v1/reviews?stationId=xxx
router.get('/', async (req, res) => {
  try {
    const { stationId } = req.query;
    if (!stationId) return res.status(400).json({ error: 'stationId is required' });

    const reviews = await prisma.review.findMany({
      where: { stationId: stationId as string },
      include: { user: { select: { displayName: true, photoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: reviews });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/v1/reviews
router.post('/', async (req, res) => {
  try {
    const { firebaseUid, displayName, email, stationId, rating, comment } = req.body;

    if (!firebaseUid || !stationId || !rating) {
      return res.status(400).json({ error: 'firebaseUid, stationId, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Find or create user in our DB
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

    // Upsert review (one review per user per station)
    const review = await prisma.review.upsert({
      where: { userId_stationId: { userId: user.id, stationId } },
      update: { rating: parseInt(rating), comment: comment ?? null },
      create: {
        userId: user.id,
        stationId,
        rating: parseInt(rating),
        comment: comment ?? null,
      },
      include: { user: { select: { displayName: true } } },
    });

    res.json({ data: review });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save review' });
  }
});

export default router;
