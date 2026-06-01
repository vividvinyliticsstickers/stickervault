import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateJobNumber } from '@/lib/utils'
import { logActivity } from '@/lib/stock'
import { z } from 'zod'

const jobSchema = z.object({
  title: z.string().min(1),
  orderId: z.string().optional().nullable(),
  priority: z.number().int().default(0),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().min(1),
    notes: z.string().optional(),
  })).optional(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  if (status) where.status = status

  const [jobs, total] = await Promise.all([
    prisma.productionJob.findMany({
      where,
      include: {
        items: { include: { product: { select: { name: true, sku: true, imageUrl: true } } } },
        order: { select: { orderNumber: true, customerName: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.productionJob.count({ where }),
  ])

  return NextResponse.json({ jobs, total, page, totalPages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = jobSchema.parse(body)

    const job = await prisma.productionJob.create({
      data: {
        jobNumber: generateJobNumber(),
        title: data.title,
        orderId: data.orderId || null,
        priority: data.priority,
        notes: data.notes,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        items: data.items ? {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        } : undefined,
      },
      include: {
        items: { include: { product: true } },
        order: true,
      },
    })

    await logActivity({
      userId: (session.user as any).id,
      action: 'CREATE',
      entity: 'production',
      entityId: job.id,
      details: { jobNumber: job.jobNumber, title: job.title },
    })

    return NextResponse.json(job, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
