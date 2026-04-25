import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requirePrivilege } from '../../middleware/privilege.middleware.js';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate);

// GET /api/dashboard — Dashboard stats (supports ?month=YYYY-MM filter)
router.get('/', requirePrivilege('view_bill'), async (req, res, next) => {
  try {
    const month = req.query.month as string | undefined; // YYYY-MM

    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;

    if (month) {
      const [y, m] = month.split('-').map(Number);
      periodStart = new Date(y, m - 1, 1);
      periodEnd = new Date(y, m, 0, 23, 59, 59, 999);
      periodLabel = periodStart.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else {
      // Default: current month
      const now = new Date();
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      periodLabel = 'This Month';
    }

    const periodFilter = { gte: periodStart, lte: periodEnd };

    const [
      totalBillsAgg,
      totalBillCount,
      receivedAgg,
      pendingAgg,
      totalCustomers,
      totalProducts,
      recentBills,
      topProducts,
    ] = await Promise.all([
      // Total amount of all generated bills in period (excl cancelled)
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { createdAt: periodFilter, status: { not: 'CANCELLED' } },
      }),
      // Total bill count in period (excl cancelled)
      prisma.bill.count({
        where: { createdAt: periodFilter, status: { not: 'CANCELLED' } },
      }),
      // Total amount received (PAID) in period
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'PAID', paidAt: periodFilter },
      }),
      // Total amount pending (UNPAID bills in period)
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'UNPAID', createdAt: periodFilter },
      }),
      // Total active customers
      prisma.customer.count({ where: { isActive: true } }),
      // Total active products
      prisma.product.count({ where: { isActive: true } }),
      // Recent 10 bills
      prisma.bill.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        where: month ? { createdAt: periodFilter } : undefined,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      // Top 5 products by revenue in period
      prisma.billItem.groupBy({
        by: ['productId'],
        _sum: { lineTotal: true, quantity: true },
        _count: true,
        where: {
          productId: { not: null },
          bill: { createdAt: periodFilter, status: { not: 'CANCELLED' } },
        },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
    ]);

    // 30-day sales trend
    const trendStart = month ? periodStart : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendEnd = month ? periodEnd : new Date();

    const salesTrend = await prisma.$queryRaw<Array<{ date: string; amount: number; count: number }>>`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(grand_total), 0)::float as amount,
        COUNT(*)::int as count
      FROM bills
      WHERE created_at >= ${trendStart}
        AND created_at <= ${trendEnd}
        AND status != 'CANCELLED'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Resolve product names
    const productIds = topProducts.map((p) => p.productId).filter(Boolean) as string[];
    const products = productIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true } })
      : [];
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    res.json({
      success: true,
      data: {
        periodLabel,
        totalBillCount,
        totalBillAmount: Number(totalBillsAgg._sum.grandTotal || 0),
        totalReceived: Number(receivedAgg._sum.grandTotal || 0),
        totalPending: Number(pendingAgg._sum.grandTotal || 0),
        totalCustomers,
        totalProducts,
        recentBills: recentBills.map((b) => ({
          ...b,
          subtotal: Number(b.subtotal),
          cgstTotal: Number(b.cgstTotal),
          sgstTotal: Number(b.sgstTotal),
          igstTotal: Number(b.igstTotal),
          taxTotal: Number(b.taxTotal),
          discountTotal: Number(b.discountTotal),
          grandTotal: Number(b.grandTotal),
        })),
        topProducts: topProducts.map((p) => ({
          productId: p.productId,
          productName: productMap.get(p.productId!) || 'Unknown',
          totalRevenue: Number(p._sum.lineTotal || 0),
          totalQuantity: Number(p._sum.quantity || 0),
        })),
        salesTrend,
      },
    });
  } catch (err) { next(err); }
});

export default router;
