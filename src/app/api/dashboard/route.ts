import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const thisMonthEnd = endOfMonth(now)
  const lastMonthStart = startOfMonth(subMonths(now, 1))
  const lastMonthEnd = endOfMonth(subMonths(now, 1))

  const [
    totalProducts,
    stockCounts,
    lowStockProducts,
    outOfStockProducts,
    recentActivity,
    thisMonthOrders,
    lastMonthOrders,
    pendingOrders,
    productionJobs,
    stockMovements,
  ] = await Promise.all([
    // Total products
    prisma.product.count({ where: { isActive: true } }),

    // Stock counts by status
    prisma.product.groupBy({
      by: ['stockStatus'],
      _sum: { currentStock: true },
      _count: true,
      where: { isActive: true },
    }),

    // Low stock products
    prisma.product.findMany({
      where: { stockStatus: 'LOW_STOCK', isActive: true },
      include: { category: true },
      orderBy: { currentStock: 'asc' },
      take: 10,
    }),

    // Out of stock
    prisma.product.findMany({
      where: { stockStatus: 'OUT_OF_STOCK', isActive: true },
      include: { category: true },
      take: 10,
    }),

    // Recent activity
    prisma.activityLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),

    // This month orders
    prisma.order.aggregate({
      where: { createdAt: { gte: thisMonthStart, lte: thisMonthEnd } },
      _count: true,
      _sum: { total: true },
    }),

    // Last month orders
    prisma.order.aggregate({
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
      _count: true,
      _sum: { total: true },
    }),

    // Pending orders
    prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION'] } } }),

    // Active production jobs
    prisma.productionJob.count({
      where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),

    // Recent stock movements (for chart)
    prisma.stockMovement.groupBy({
      by: ['createdAt'],
      _count: true,
      where: { createdAt: { gte: subMonths(now, 6) } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Calculate total inventory value
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { currentStock: true, costPrice: true },
  })
  const inventoryValue = products.reduce(
    (sum, p) => sum + p.currentStock * parseFloat(p.costPrice.toString()),
    0
  )

  const totalStock = stockCounts.reduce((sum, s) => sum + (s._sum.currentStock || 0), 0)

  // Monthly stats for chart (last 6 months)
  const monthlyStats = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i))
    const monthEnd = endOfMonth(subMonths(now, i))
    const [orders, movements] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.stockMovement.count({
        where: { type: 'STOCK_IN', createdAt: { gte: monthStart, lte: monthEnd } },
      }),
    ])
    monthlyStats.push({
      month: monthStart.toLocaleDateString('en-GB', { month: 'short' }),
      orders: orders._count,
      revenue: parseFloat(orders._sum.total?.toString() || '0'),
      stockIn: movements,
    })
  }

  return NextResponse.json({
    totalProducts,
    totalStock,
    inventoryValue,
    lowStockCount: lowStockProducts.length,
    outOfStockCount: outOfStockProducts.length,
    pendingOrders,
    activeProductionJobs: productionJobs,
    recentActivity: recentActivity.slice(0, 10),
    lowStockProducts,
    outOfStockProducts,
    thisMonth: {
      orders: thisMonthOrders._count,
      revenue: parseFloat(thisMonthOrders._sum.total?.toString() || '0'),
    },
    lastMonth: {
      orders: lastMonthOrders._count,
      revenue: parseFloat(lastMonthOrders._sum.total?.toString() || '0'),
    },
    monthlyStats,
  })
}
