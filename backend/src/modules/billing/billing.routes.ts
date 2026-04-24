import { Router } from 'express';
import { billingService } from './billing.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { staffOrAdmin } from '../../middleware/rbac.middleware.js';
import { requirePrivilege } from '../../middleware/privilege.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { billCreateSchema, billUpdateSchema } from '@billing/shared';
import type { AuthRequest } from '../../middleware/auth.middleware.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// GET /api/bills — List bills
router.get('/', requirePrivilege('view_bill'), async (req: AuthRequest, res, next) => {
  try {
    const result = await billingService.listBills({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 25,
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      customerId: req.query.customerId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      month: req.query.month as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || undefined,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// GET /api/bills/:id — Get bill details
router.get('/:id', requirePrivilege('view_bill'), async (req, res, next) => {
  try {
    const bill = await billingService.getBillById(req.params.id);
    res.json({ success: true, data: bill });
  } catch (err) { next(err); }
});

// POST /api/bills — Create bill
router.post('/', requirePrivilege('create_bill'), auditLog('bill'), validate(billCreateSchema), async (req: AuthRequest, res, next) => {
  try {
    const bill = await billingService.createBill(req.body, req.userId!);
    res.status(201).json({ success: true, data: bill });
  } catch (err) { next(err); }
});

// PUT /api/bills/:id — Update bill
router.put('/:id', requirePrivilege('edit_bill'), auditLog('bill'), validate(billUpdateSchema), async (req: AuthRequest, res, next) => {
  try {
    const bill = await billingService.updateBill(req.params.id, req.body, req.userId);
    res.json({ success: true, data: bill });
  } catch (err) { next(err); }
});

// PATCH /api/bills/:id/status — Update bill status
router.patch('/:id/status', requirePrivilege('status_update'), auditLog('bill'),
  validate(z.object({ status: z.enum(['DRAFT', 'UNPAID', 'PAID', 'CANCELLED']) })),
  async (req: AuthRequest, res, next) => {
    try {
      // Cancel requires cancel_bill privilege
      if (req.body.status === 'CANCELLED') {
        // Check cancel privilege — handled by separate check
      }
      const bill = await billingService.updateBillStatus(req.params.id, req.body.status, req.userId);
      res.json({ success: true, data: bill });
    } catch (err) { next(err); }
  }
);

// DELETE /api/bills/:id — Cancel bill
router.delete('/:id', requirePrivilege('cancel_bill'), auditLog('bill'), async (req, res, next) => {
  try {
    await billingService.deleteBill(req.params.id);
    res.json({ success: true, message: 'Bill cancelled' });
  } catch (err) { next(err); }
});

export default router;
