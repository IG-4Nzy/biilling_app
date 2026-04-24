import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { adminOnly } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { companyProfileSchema } from '@billing/shared';

const router = Router();

// Middleware: all routes require authentication
router.use(authenticate);

// GET /api/company — Get company profile
router.get('/', async (req, res, next) => {
  try {
    let profile = await prisma.companyProfile.findUnique({ where: { id: 'default' } });

    if (!profile) {
      // Create default profile
      profile = await prisma.companyProfile.create({
        data: {
          id: 'default',
          name: 'Your Company Name',
          address: 'Your Address',
        },
      });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

// PUT /api/company — Update company profile (admin only)
router.put('/',
  adminOnly,
  validate(companyProfileSchema),
  async (req, res, next) => {
    try {
      const profile = await prisma.companyProfile.upsert({
        where: { id: 'default' },
        update: req.body,
        create: { id: 'default', ...req.body },
      });

      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
