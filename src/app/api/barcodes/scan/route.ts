import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) return NextResponse.json({ error: 'No code provided' }, { status: 400 })

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { barcode: code },
        { sku: code },
      ],
    },
    include: { category: true },
  })

  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  return NextResponse.json(product)
}
