/**
 * Car image routes
 *
 * Public:
 *   GET  /api/v1/car-images?make=BYD&model=Shark 6 DMO Premium
 *        → { imageUrl } or 404
 *
 * Admin (require x-admin-secret header):
 *   GET    /api/v1/car-images/admin           → list all entries
 *   POST   /api/v1/car-images/admin           → { make, model, imageUrl } upsert by URL
 *   POST   /api/v1/car-images/admin/upload    → multipart: fields make+model, file "image"
 *   DELETE /api/v1/car-images/admin/:id       → delete entry
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { uploadBuffer } from '../lib/cloudinary';

const router  = Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const ADMIN_SECRET = process.env.ADMIN_SECRET ?? '';

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: () => void) {
  if (!ADMIN_SECRET) return next(); // no secret set → open (dev only)
  if (req.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function toKey(s: string) { return s.trim().toLowerCase(); }

// ── PUBLIC ────────────────────────────────────────────────────────────────────

// GET /api/v1/car-images?make=BYD&model=Shark 6 DMO Premium
router.get('/', async (req: Request, res: Response) => {
  const { make, model } = req.query;
  if (!make || !model) return res.status(400).json({ error: 'make and model are required' });

  try {
    // Exact match first
    let entry = await prisma.carImage.findFirst({
      where: {
        make:  { equals: String(make),  mode: 'insensitive' },
        model: { equals: String(model), mode: 'insensitive' },
      },
    });

    // Partial match — model starts with query (handles trim variants like "Shark 6 DMO Premium" → "Shark")
    if (!entry) {
      const all = await prisma.carImage.findMany({
        where: { make: { equals: String(make), mode: 'insensitive' } },
      });
      const queryModel = toKey(String(model));
      entry = all.find(e =>
        queryModel.startsWith(toKey(e.model)) || toKey(e.model).startsWith(queryModel)
      ) ?? null;
    }

    if (!entry) return res.status(404).json({ error: 'No image found' });
    return res.json({ imageUrl: entry.imageUrl, source: entry.source });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────

// GET /api/v1/car-images/admin  — list all
router.get('/admin', requireAdmin, async (_req: Request, res: Response) => {
  const entries = await prisma.carImage.findMany({ orderBy: [{ make: 'asc' }, { model: 'asc' }] });
  return res.json(entries);
});

// POST /api/v1/car-images/admin  — upsert by URL
// Body: { make, model, imageUrl }
router.post('/admin', requireAdmin, async (req: Request, res: Response) => {
  const { make, model, imageUrl } = req.body;
  if (!make || !model || !imageUrl) {
    return res.status(400).json({ error: 'make, model, imageUrl are required' });
  }
  try {
    const entry = await prisma.carImage.upsert({
      where:  { make_model: { make: String(make).trim(), model: String(model).trim() } },
      update: { imageUrl: String(imageUrl).trim(), source: 'manual', updatedAt: new Date() },
      create: { make: String(make).trim(), model: String(model).trim(), imageUrl: String(imageUrl).trim(), source: 'manual' },
    });
    return res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save' });
  }
});

// POST /api/v1/car-images/admin/upload  — upload image file to Cloudinary
// Multipart fields: make (text), model (text), image (file)
router.post('/admin/upload', requireAdmin, upload.single('image'), async (req: Request, res: Response) => {
  const { make, model } = req.body;
  if (!make || !model || !req.file) {
    return res.status(400).json({ error: 'make, model and image file are required' });
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(503).json({ error: 'Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.' });
  }
  try {
    const publicId = `${toKey(make)}-${toKey(model)}`.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const imageUrl = await uploadBuffer(req.file.buffer, publicId);

    const entry = await prisma.carImage.upsert({
      where:  { make_model: { make: String(make).trim(), model: String(model).trim() } },
      update: { imageUrl, source: 'cloudinary', updatedAt: new Date() },
      create: { make: String(make).trim(), model: String(model).trim(), imageUrl, source: 'cloudinary' },
    });
    return res.status(201).json(entry);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message ?? 'Upload failed' });
  }
});

// DELETE /api/v1/car-images/admin/:id
router.delete('/admin/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await prisma.carImage.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(404).json({ error: 'Not found' });
  }
});

export default router;
