import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'STAFF', 'VIEWER']).default('STAFF'),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const data = userSchema.parse(body)

    const hashed = await bcrypt.hash(data.password, 12)
    const user = await prisma.user.create({
      data: { ...data, password: hashed },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
