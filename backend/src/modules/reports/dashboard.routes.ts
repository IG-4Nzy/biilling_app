import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { staffOrAdmin } from '../../middleware/rbac.middleware.js';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(authenticate);

// GET /api/dashboard — Dashboard stats
router.get('/', staffOrAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [
      todayRevenue,
      weekRevenue,
      monthRevenue,
      yearRevenue,
      todayBills,
      pendingBills,
      totalCustomers,
      totalProducts,
      recentBills,
      topProducts,
    ] = await Promise.all([
      // Today's revenue
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'PAID', paidAt: { gte: todayStart } },
      }),
      // Week's revenue
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'PAID', paidAt: { gte: weekStart } },
      }),
      // Month's revenue
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'PAID', paidAt: { gte: monthStart } },
      }),
      // Year's revenue
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'PAID', paidAt: { gte: yearStart } },
      }),
      // Today's bill count
      prisma.bill.count({
        where: { createdAt: { gte: todayStart } },
      }),
      // Pending amount (UNPAID only)
      prisma.bill.aggregate({
        _sum: { grandTotal: true },
        where: { status: 'UNPAID' },
      }),
      // Total active customers
      prisma.customer.count({ where: { isActive: true } }),
      // Total active products
      prisma.product.count({ where: { isActive: true } }),
      // Recent 10 bills
      prisma.bill.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      // Top 5 products by revenue
      prisma.billItem.groupBy({
        by: ['productId'],
        _sum: { lineTotal: true, quantity: true },
        where: { productId: { not: null } },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
    ]);

    // Get product names for top products
    const productIds = topProducts
      .map((p) => p.productId)
      .filter(Boolean) as string[];
    
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    // Sales trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesTrend = await prisma.$queryRaw<Array<{ date: string; amount: number; count: number }>>`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(grand_total), 0)::float as amount,
        COUNT(*)::int as count
      FROM bills
      WHERE created_at >= ${thirtyDaysAgo}
        AND status != 'CANCELLED'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    res.json({
      success: true,
      data: {
        todayRevenue: Number(todayRevenue._sum.grandTotal || 0),
        weekRevenue: Number(weekRevenue._sum.grandTotal || 0),
        monthRevenue: Number(monthRevenue._sum.grandTotal || 0),
        yearRevenue: Number(yearRevenue._sum.grandTotal || 0),
        todayBills,
        pendingAmount: Number(pendingBills._sum.grandTotal || 0),
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
