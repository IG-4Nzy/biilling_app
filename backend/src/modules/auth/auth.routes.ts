import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authLimiter } from '../../middleware/rateLimiter.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { loginSchema } from '@billing/shared';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/database.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/login', authLimiter, validate(loginSchema), (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.post('/refresh', authLimiter, (req, res, next) => {
  authController.refresh(req, res).catch(next);
});

// Protected routes
router.post('/logout', authenticate, (req, res, next) => {
  authController.logout(req, res).catch(next);
});

// Change password
router.post(
  '/change-password',
  authenticate,
  validate(z.object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z.string().min(8, 'Minimum 8 characters'),
  })),
  async (req: AuthRequest, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) { res.status(400).json({ success: false, error: 'Current password is incorrect' }); return; }

      const hash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: req.userId! }, data: { passwordHash: hash } });

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) { next(err); }
  }
);

router.get('/sessions', authenticate, (req, res, next) => {
  authController.getSessions(req, res).catch(next);
});

router.delete('/sessions/:id', authenticate, (req, res, next) => {
  authController.revokeSession(req, res).catch(next);
});

// Verify password (for sensitive actions)
router.post(
  '/verify-password',
  authenticate,
  validate(z.object({ password: z.string().min(1, 'Password required') })),
  async (req: AuthRequest, res, next) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return; }

      const valid = await bcrypt.compare(req.body.password, user.passwordHash);
      if (!valid) { res.status(400).json({ success: false, error: 'Incorrect password' }); return; }

      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

export default router;
