import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { staffOrAdmin } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { customerCreateSchema, customerUpdateSchema } from '@billing/shared';
import { encrypt, decrypt } from '../../utils/crypto.js';
import { NotFoundError } from '../../middleware/errorHandler.middleware.js';
import { emitToAll } from '../../config/socket.js';
import type { AuthRequest } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Decrypt sensitive fields for response
function decryptCustomer(customer: any) {
  return {
    ...customer,
    phone: customer.phone ? decrypt(customer.phone) : null,
    gstin: customer.gstin ? decrypt(customer.gstin) : null,
  };
}

// GET /api/customers — List customers
router.get('/', staffOrAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';
    orderBy[sortBy] = sortOrder;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: limit, orderBy }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers.map(decryptCustomer),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// GET /api/customers/:id
router.get('/:id', staffOrAdmin, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        bills: {
          select: {
            id: true, invoiceNumber: true, grandTotal: true,
            status: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) throw new NotFoundError('Customer');

    res.json({ success: true, data: decryptCustomer(customer) });
  } catch (err) { next(err); }
});

// POST /api/customers
router.post('/', staffOrAdmin, auditLog('customer'), validate(customerCreateSchema), async (req: AuthRequest, res, next) => {
  try {
    const { name, email, phone, address, gstin, state, stateCode } = req.body;

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone ? encrypt(phone) : null,
        address: address || null,
        gstin: gstin ? encrypt(gstin) : null,
        state: state || null,
        stateCode: stateCode || null,
        createdBy: req.userId!,
      },
    });

    const decrypted = decryptCustomer(customer);
    emitToAll('customer:created', decrypted);

    res.status(201).json({ success: true, data: decrypted });
  } catch (err) { next(err); }
});

// PUT /api/customers/:id
router.put('/:id', staffOrAdmin, auditLog('customer'), validate(customerUpdateSchema), async (req, res, next) => {
  try {
    const { name, email, phone, address, gstin, state, stateCode } = req.body;

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone ? encrypt(phone) : null }),
        ...(address !== undefined && { address }),
        ...(gstin !== undefined && { gstin: gstin ? encrypt(gstin) : null }),
        ...(state !== undefined && { state: state || null }),
        ...(stateCode !== undefined && { stateCode: stateCode || null }),
      },
    });

    const decrypted = decryptCustomer(customer);
    emitToAll('customer:updated', decrypted);

    res.json({ success: true, data: decrypted });
  } catch (err) { next(err); }
});

// DELETE /api/customers/:id (soft delete)
router.delete('/:id', staffOrAdmin, auditLog('customer'), async (req, res, next) => {
  try {
    await prisma.customer.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Customer deleted' });
  } catch (err) { next(err); }
});

export default router;
