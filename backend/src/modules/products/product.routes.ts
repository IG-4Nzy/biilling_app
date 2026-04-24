import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { staffOrAdmin } from '../../middleware/rbac.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { auditLog } from '../../middleware/audit.middleware.js';
import { productCreateSchema, productUpdateSchema } from '@billing/shared';
import { NotFoundError } from '../../middleware/errorHandler.middleware.js';
import { emitToAll } from '../../config/socket.js';

const router = Router();
router.use(authenticate);

// GET /api/products
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
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';
    orderBy[sortBy] = sortOrder;

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take: limit, orderBy }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products.map(p => ({
        ...p,
        unitPrice: Number(p.unitPrice),
        taxRate: Number(p.taxRate),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
});

// GET /api/products/:id
router.get('/:id', staffOrAdmin, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) throw new NotFoundError('Product');

    res.json({
      success: true,
      data: { ...product, unitPrice: Number(product.unitPrice), taxRate: Number(product.taxRate) },
    });
  } catch (err) { next(err); }
});

// POST /api/products
router.post('/', staffOrAdmin, auditLog('product'), validate(productCreateSchema), async (req, res, next) => {
  try {
    const product = await prisma.product.create({
      data: req.body,
    });

    const data = { ...product, unitPrice: Number(product.unitPrice), taxRate: Number(product.taxRate) };
    emitToAll('product:created', data);

    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

// PUT /api/products/:id
router.put('/:id', staffOrAdmin, auditLog('product'), validate(productUpdateSchema), async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
    });

    const data = { ...product, unitPrice: Number(product.unitPrice), taxRate: Number(product.taxRate) };
    emitToAll('product:updated', data);

    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', staffOrAdmin, auditLog('product'), async (req, res, next) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    emitToAll('product:deleted', { id: req.params.id });
    res.json({ success: true, message: 'Product deleted' });
  } catch (err) { next(err); }
});

// PATCH /api/products/:id/stock — Update stock
router.patch('/:id/stock', staffOrAdmin, auditLog('product'), async (req, res, next) => {
  try {
    const { adjustment } = req.body; // positive = add, negative = subtract

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stock: { increment: adjustment } },
    });

    emitToAll('stock:updated', { productId: product.id, stock: product.stock });
    res.json({ success: true, data: { id: product.id, stock: product.stock } });
  } catch (err) { next(err); }
});

export default router;
