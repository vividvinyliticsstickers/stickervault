import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { updateStockLevel, logActivity } from '@/lib/stock'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const stockOpSchema = z.object({
  productId: z.string(),
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'DAMAGED', 'RETURNED', 'AUDIT']),
  quantity: z.number().int(),
  reference: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

// Batch schema
const batchSchema = z.object({
  operations: z.array(stockOpSchema),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // Support both single and batch operations
    const operations = body.operations || [body]

    const results = []
    for (const op of operations) {
      const data = stockOpSchema.parse(op)

      // Determine quantity change direction
      let change = data.quantity
      if (['STOCK_OUT', 'DAMAGED'].includes(data.type)) {
        change = -Math.abs(data.quantity)
      } else if (data.type === 'ADJUSTMENT' || data.type === 'AUDIT') {
        // For adjustments, quantity IS the new stock level
        const product = await prisma.product.findUniqueOrThrow({ where: { id: data.productId } })
        change = data.quantity - product.currentStock
      }

      const updated = await updateStockLevel({
        productId: data.productId,
        userId: (session.user as any).id,
        type: data.type,
        quantityChange: change,
        reference: data.reference,
        reason: data.reason,
        notes: data.notes,
      })

      await logActivity({
        userId: (session.user as any).id,
        action: `STOCK_${data.type}`,
        entity: 'product',
        entityId: data.productId,
        details: { quantity: data.quantity, type: data.type, reason: data.reason },
      })

      results.push(updated)
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')

  const where: any = {}
  if (productId) where.productId = productId
  if (type) where.type = type

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true, barcode: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return NextResponse.json({ movements, total, page, totalPages: Math.ceil(total / limit) })
}
