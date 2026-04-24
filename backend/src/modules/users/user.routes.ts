import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { adminOnly, anyRole } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { registerSchema } from '@billing/shared';
import { AppError, NotFoundError } from '../../middleware/errorHandler.middleware.js';
import { ALL_PRIVILEGES, DEFAULT_ROLE_PRIVILEGES } from '../../middleware/privilege.middleware.js';
import bcrypt from 'bcrypt';

const router = Router();
router.use(authenticate);

// GET /api/users/privileges — List available privileges
router.get('/privileges', adminOnly, async (_req, res) => {
  res.json({
    success: true,
    data: {
      all: ALL_PRIVILEGES,
      defaults: DEFAULT_ROLE_PRIVILEGES,
    },
  });
});

// GET /api/users — List users (admin only)
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, role: true, privileges: true,
          mfaEnabled: true, isActive: true, lastLogin: true,
          createdAt: true, updatedAt: true,
        },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// GET /api/users/:id — Get user by ID
router.get('/:id', adminOnly, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, role: true, privileges: true,
        mfaEnabled: true, isActive: true, lastLogin: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundError('User');
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// POST /api/users — Create user (admin only)
router.post('/', adminOnly, auditLog('user'), validate(registerSchema), async (req, res, next) => {
  try {
    const { email, name, password, role, privileges } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already registered', 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email, name, passwordHash,
        role: role as any,
        privileges: privileges || [],
      },
      select: {
        id: true, email: true, name: true, role: true, privileges: true,
        mfaEnabled: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PUT /api/users/:id — Update user (admin only)
router.put('/:id', adminOnly, auditLog('user'), async (req, res, next) => {
  try {
    const { name, role, isActive, privileges } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(role && { role: role as any }),
        ...(isActive !== undefined && { isActive }),
        ...(privileges !== undefined && { privileges }),
      },
      select: {
        id: true, email: true, name: true, role: true, privileges: true,
        mfaEnabled: true, isActive: true, createdAt: true, updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id — Deactivate user (admin only)
router.delete('/:id', adminOnly, auditLog('user'), async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) { next(err); }
});

// GET /api/users/:id/login-logs — User login history
router.get('/:id/login-logs', adminOnly, async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: req.params.id,
        action: { in: ['LOGIN', 'LOGIN_FAILED', 'LOGOUT'] },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
});

export default router;
