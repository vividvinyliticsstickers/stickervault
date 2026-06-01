import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logActivity, updateStockLevel } from '@/lib/stock'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, sku: true, imageUrl: true, barcode: true, currentStock: true },
          },
        },
      },
      createdBy: { select: { name: true, email: true } },
      productionJob: true,
    },
  })

  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { status, ...rest } = body

    const order = await prisma.order.findUniqueOrThrow({ where: { id: params.id } })

    const updateData: any = { ...rest }
    if (status) {
      updateData.status = status
      if (status === 'PACKED') updateData.packedAt = new Date()
      if (status === 'DISPATCHED') updateData.dispatchedAt = new Date()
      if (status === 'COMPLETED') updateData.completedAt = new Date()
    }

    // If completing order, deduct stock
    if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
      const items = await prisma.orderItem.findMany({
        where: { orderId: params.id },
      })
      for (const item of items) {
        await updateStockLevel({
          productId: item.productId,
          userId: (session.user as any).id,
          type: 'ORDER_FULFILLED',
          quantityChange: -item.quantity,
          reference: order.orderNumber,
          reason: `Order ${order.orderNumber} fulfilled`,
        })
      }
    }

    const updated = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        createdBy: { select: { name: true } },
      },
    })

    await logActivity({
      userId: (session.user as any).id,
      action: 'UPDATE',
      entity: 'order',
      entityId: params.id,
      details: { orderNumber: order.orderNumber, status },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await prisma.order.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
