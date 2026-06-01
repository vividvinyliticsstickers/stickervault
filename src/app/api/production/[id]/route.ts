import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { logActivity } from '@/lib/stock'

const PRODUCTION_FLOW = [
  'QUEUED', 'READY_TO_PRINT', 'PRINTING', 'LAMINATING', 'CUTTING', 'PACKAGING', 'COMPLETED'
]

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const job = await prisma.productionJob.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { product: { select: { name: true, sku: true, imageUrl: true, currentStock: true } } } },
      order: { select: { orderNumber: true, customerName: true, dueDate: true } },
    },
  })

  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(job)
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { status, itemUpdates, ...rest } = body

    const updateData: any = { ...rest }
    if (status) {
      updateData.status = status
      if (status === 'PRINTING' && !rest.startedAt) updateData.startedAt = new Date()
      if (status === 'COMPLETED') updateData.completedAt = new Date()
    }

    // Update individual item progress
    if (itemUpdates) {
      for (const itemUpdate of itemUpdates) {
        await prisma.productionItem.update({
          where: { id: itemUpdate.id },
          data: { quantityDone: itemUpdate.quantityDone },
        })
      }
    }

    const job = await prisma.productionJob.update({
      where: { id: params.id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        order: true,
      },
    })

    // If linked order, update order status too
    if (status === 'COMPLETED' && job.orderId) {
      await prisma.order.update({
        where: { id: job.orderId },
        data: { status: 'READY_TO_PACK' },
      })
    }

    await logActivity({
      userId: (session.user as any).id,
      action: 'UPDATE',
      entity: 'production',
      entityId: params.id,
      details: { jobNumber: job.jobNumber, status },
    })

    return NextResponse.json(job)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await prisma.productionJob.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
