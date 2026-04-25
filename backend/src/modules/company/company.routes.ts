import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { adminOnly } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { companyProfileSchema } from '@billing/shared';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  },
});

const router = Router();
router.use(authenticate);

// GET /api/company — Get company profile
router.get('/', async (req, res, next) => {
  try {
    let profile = await prisma.companyProfile.findUnique({ where: { id: 'default' } });
    if (!profile) {
      profile = await prisma.companyProfile.create({
        data: { id: 'default', name: 'Your Company Name', address: 'Your Address' },
      });
    }
    res.json({ success: true, data: profile });
  } catch (error) { next(error); }
});

// PUT /api/company — Update company profile (admin only)
router.put('/', adminOnly, validate(companyProfileSchema), async (req, res, next) => {
  try {
    const profile = await prisma.companyProfile.upsert({
      where: { id: 'default' },
      update: req.body,
      create: { id: 'default', ...req.body },
    });
    res.json({ success: true, data: profile });
  } catch (error) { next(error); }
});

// POST /api/company/logo — Upload company logo (admin only)
router.post('/logo', adminOnly, upload.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) { res.status(400).json({ success: false, error: 'No file uploaded' }); return; }

    // Delete old logo if exists
    const existing = await prisma.companyProfile.findUnique({ where: { id: 'default' }, select: { logoPath: true } });
    if (existing?.logoPath) {
      const oldPath = path.resolve(uploadsDir, path.basename(existing.logoPath));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const logoPath = `/uploads/${req.file.filename}`;
    await prisma.companyProfile.update({ where: { id: 'default' }, data: { logoPath } });

    res.json({ success: true, data: { logoPath } });
  } catch (error) { next(error); }
});

// DELETE /api/company/logo — Remove company logo (admin only)
router.delete('/logo', adminOnly, async (req, res, next) => {
  try {
    const existing = await prisma.companyProfile.findUnique({ where: { id: 'default' }, select: { logoPath: true } });
    if (existing?.logoPath) {
      const oldPath = path.resolve(uploadsDir, path.basename(existing.logoPath));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await prisma.companyProfile.update({ where: { id: 'default' }, data: { logoPath: null } });
    res.json({ success: true, message: 'Logo removed' });
  } catch (error) { next(error); }
});

export default router;
