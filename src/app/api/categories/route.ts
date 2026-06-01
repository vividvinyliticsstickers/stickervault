import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const category = await prisma.category.create({ data: body })
    return NextResponse.json(category, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
