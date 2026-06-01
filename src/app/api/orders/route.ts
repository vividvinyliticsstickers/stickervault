import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateOrderNumber } from '@/lib/utils'
import { logActivity } from '@/lib/stock'
import { z } from 'zod'

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
})

const orderSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  notes: z.string().optional(),
  isCustomOrder: z.boolean().default(false),
  dueDate: z.string().optional(),
  discount: z.number().min(0).default(0),
  items: z.array(orderItemSchema).min(1),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerEmail: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true, sku: true, imageUrl: true } } } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ])

  return NextResponse.json({ orders, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = orderSchema.parse(body)

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const total = Math.max(0, subtotal - (data.discount || 0))

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone,
        customerAddress: data.customerAddress,
        notes: data.notes,
        isCustomOrder: data.isCustomOrder,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        discount: data.discount,
        subtotal,
        total,
        createdById: (session.user as any).id,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
    })

    await logActivity({
      userId: (session.user as any).id,
      action: 'CREATE',
      entity: 'order',
      entityId: order.id,
      details: { orderNumber: order.orderNumber, customer: order.customerName },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
