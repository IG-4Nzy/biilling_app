import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { staffOrAdmin } from '../../middleware/rbac.middleware.js';
import { exportLimiter } from '../../middleware/rateLimiter.middleware.js';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate, staffOrAdmin);

// GET /api/reports/sales — Sales report
router.get('/sales', async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query as any;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    let dateFormat: string;
    switch (groupBy) {
      case 'month': dateFormat = 'YYYY-MM'; break;
      case 'year': dateFormat = 'YYYY'; break;
      case 'week': dateFormat = 'IYYY-IW'; break;
      default: dateFormat = 'YYYY-MM-DD';
    }

    const salesData = await prisma.$queryRaw<Array<{ period: string; total_revenue: number; bill_count: number; paid_count: number }>>`
      SELECT 
        TO_CHAR(created_at, ${Prisma.raw(`'${dateFormat}'`)}) as period,
        COALESCE(SUM(grand_total), 0)::float as total_revenue,
        COUNT(*)::int as bill_count,
        COUNT(*) FILTER (WHERE status = 'PAID')::int as paid_count
      FROM bills
      WHERE created_at >= ${start}
        AND created_at <= ${end}
        AND status != 'CANCELLED'
      GROUP BY period
      ORDER BY period ASC
    `;

    // Summary stats
    const summary = await prisma.bill.aggregate({
      _sum: { grandTotal: true },
      _count: true,
      _avg: { grandTotal: true },
      where: {
        createdAt: { gte: start, lte: end },
        status: { not: 'CANCELLED' },
      },
    });

    res.json({
      success: true,
      data: {
        salesData,
        summary: {
          totalRevenue: Number(summary._sum.grandTotal || 0),
          totalBills: summary._count,
          averageBillValue: Number(summary._avg.grandTotal || 0),
        },
        filters: { startDate: start, endDate: end, groupBy },
      },
    });
  } catch (err) { next(err); }
});

// GET /api/reports/customers — Customer spending report
router.get('/customers', async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query as any;

    const where: any = { status: { not: 'CANCELLED' } };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const customerSpending = await prisma.bill.groupBy({
      by: ['customerId'],
      _sum: { grandTotal: true },
      _count: true,
      where,
      orderBy: { _sum: { grandTotal: 'desc' } },
      take: parseInt(limit),
    });

    const customerIds = customerSpending.map((c) => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    res.json({
      success: true,
      data: customerSpending.map((cs) => ({
        customerId: cs.customerId,
        customerName: customerMap.get(cs.customerId)?.name || 'Unknown',
        customerEmail: customerMap.get(cs.customerId)?.email || null,
        totalSpent: Number(cs._sum.grandTotal || 0),
        billCount: cs._count,
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/reports/products — Top products report
router.get('/products', async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query as any;

    const where: any = { productId: { not: null } };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const topProducts = await prisma.billItem.groupBy({
      by: ['productId'],
      _sum: { lineTotal: true, quantity: true },
      _count: true,
      where,
      orderBy: { _sum: { lineTotal: 'desc' } },
      take: parseInt(limit),
    });

    const productIds = topProducts.map((p) => p.productId).filter(Boolean) as string[];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, category: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    res.json({
      success: true,
      data: topProducts.map((tp) => ({
        productId: tp.productId,
        productName: productMap.get(tp.productId!)?.name || 'Unknown',
        sku: productMap.get(tp.productId!)?.sku || '',
        category: productMap.get(tp.productId!)?.category || null,
        totalRevenue: Number(tp._sum.lineTotal || 0),
        totalQuantity: Number(tp._sum.quantity || 0),
        orderCount: tp._count,
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/reports/export — Export data as CSV
router.get('/export', exportLimiter, async (req, res, next) => {
  try {
    const { type = 'bills', startDate, endDate, format = 'csv' } = req.query as any;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 3));
    const end = endDate ? new Date(endDate) : new Date();

    if (type === 'bills') {
      const bills = await prisma.bill.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELLED' },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      if (format === 'csv') {
        const csvHeader = 'Invoice Number,Customer,Status,Subtotal,CGST,SGST,Tax,Grand Total,Invoice Date,Paid At\n';
        const csvRows = bills.map((b) =>
          `"${b.invoiceNumber}","${b.customer.name}","${b.status}",${b.subtotal},${b.cgstTotal},${b.sgstTotal},${b.taxTotal},${b.grandTotal},"${b.invoiceDate?.toISOString() || ''}","${b.paidAt?.toISOString() || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=bills-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.csv`);
        res.send(csvHeader + csvRows);
        return;
      }
    }

    res.status(400).json({ success: false, error: 'Invalid export type or format' });
  } catch (err) { next(err); }
});

// GET /api/reports/audit-logs — Audit log report (admin)
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, userId, entity, action } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { timestamp: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) { next(err); }
});

export default router;
