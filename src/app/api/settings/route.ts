import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json(settings)
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (session.user as any).role
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()

    const updates = await Promise.all(
      Object.entries(body)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([key, value]) =>
          prisma.setting.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value) },
          })
        )
    )

    return NextResponse.json({ success: true, updated: updates.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
