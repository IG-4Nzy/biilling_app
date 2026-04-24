import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authLimiter } from '../../middleware/rateLimiter.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { loginSchema } from '@billing/shared';
import { z } from 'zod';

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

router.post('/mfa/setup', authenticate, (req, res, next) => {
  authController.setupMFA(req, res).catch(next);
});

router.post(
  '/mfa/verify',
  authenticate,
  validate(z.object({ code: z.string().length(6) })),
  (req, res, next) => {
    authController.verifyMFA(req, res).catch(next);
  }
);

router.get('/sessions', authenticate, (req, res, next) => {
  authController.getSessions(req, res).catch(next);
});

router.delete('/sessions/:id', authenticate, (req, res, next) => {
  authController.revokeSession(req, res).catch(next);
});

export default router;
