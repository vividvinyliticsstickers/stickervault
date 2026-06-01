import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logActivity } from '@/lib/stock'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      stockMovements: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(product)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    // Determine new stock status if stock changed
    let stockStatus = body.stockStatus
    if (body.currentStock !== undefined && !stockStatus) {
      const product = await prisma.product.findUniqueOrThrow({ where: { id: params.id } })
      const minStock = body.minStockLevel ?? product.minStockLevel
      if (body.currentStock === 0) stockStatus = 'OUT_OF_STOCK'
      else if (body.currentStock <= minStock) stockStatus = 'LOW_STOCK'
      else stockStatus = 'IN_STOCK'
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...body,
        stockStatus: stockStatus as any,
        updatedAt: new Date(),
      },
      include: { category: true },
    })

    await logActivity({
      userId: (session.user as any).id,
      action: 'UPDATE',
      entity: 'product',
      entityId: product.id,
      details: { name: product.name, changes: Object.keys(body) },
    })

    return NextResponse.json(product)
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
    // Soft delete
    const product = await prisma.product.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    await logActivity({
      userId: (session.user as any).id,
      action: 'DELETE',
      entity: 'product',
      entityId: params.id,
      details: { name: product.name },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 400 })
  }
}
