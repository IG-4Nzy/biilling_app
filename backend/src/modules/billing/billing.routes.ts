import { Router } from 'express';
import { billingService } from './billing.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { staffOrAdmin, adminOnly } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { billCreateSchema, billUpdateSchema } from '@billing/shared';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// GET /api/bills — List bills
router.get('/', staffOrAdmin, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const customerId = req.query.customerId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const result = await billingService.listBills({
      page, limit, search, status, customerId, startDate, endDate,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || undefined,
    });

    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/bills/:id — Get bill details
router.get('/:id', staffOrAdmin, async (req, res, next) => {
  try {
    const bill = await billingService.getBillById(req.params.id);
    res.json({ success: true, data: bill });
  } catch (err) { next(err); }
});

// POST /api/bills — Create bill
router.post('/', staffOrAdmin, auditLog('bill'), validate(billCreateSchema), async (req: AuthRequest, res, next) => {
  try {
    const bill = await billingService.createBill(req.body, req.userId!);
    res.status(201).json({ success: true, data: bill });
  } catch (err) { next(err); }
});

// PUT /api/bills/:id — Update bill
router.put('/:id', staffOrAdmin, auditLog('bill'), validate(billUpdateSchema), async (req, res, next) => {
  try {
    const bill = await billingService.updateBill(req.params.id, req.body);
    res.json({ success: true, data: bill });
  } catch (err) { next(err); }
});

// PATCH /api/bills/:id/status — Update bill status
router.patch('/:id/status', staffOrAdmin, auditLog('bill'),
  validate(z.object({ status: z.enum(['DRAFT', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED']) })),
  async (req, res, next) => {
    try {
      const bill = await billingService.updateBillStatus(req.params.id, req.body.status);
      res.json({ success: true, data: bill });
    } catch (err) { next(err); }
  }
);

// DELETE /api/bills/:id — Delete bill (admin only)
router.delete('/:id', adminOnly, auditLog('bill'), async (req, res, next) => {
  try {
    await billingService.deleteBill(req.params.id);
    res.json({ success: true, message: 'Bill cancelled' });
  } catch (err) { next(err); }
});

export default router;
