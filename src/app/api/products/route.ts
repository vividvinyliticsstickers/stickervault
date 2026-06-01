import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateBarcode, generateSKU } from '@/lib/utils'
import { logActivity } from '@/lib/stock'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productType: z.string().default('INDIVIDUAL_STICKER'),
  categoryId: z.string().optional().nullable(),
  costPrice: z.number().min(0).default(0),
  salePrice: z.number().min(0).default(0),
  currentStock: z.number().int().min(0).default(0),
  minStockLevel: z.number().int().min(0).default(5),
  maxStockLevel: z.number().int().min(0).default(100),
  imageUrl: z.string().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable(),
  unit: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
  sku: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  const where: any = { isActive: true }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (category) where.categoryId = category
  if (type) where.productType = type
  if (status) where.stockStatus = status

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = productSchema.parse(body)

    // Auto-generate SKU if not provided
    const sku = data.sku || generateSKU(
      data.productType === 'INDIVIDUAL_STICKER' ? 'STK'
      : data.productType === 'STICKER_PACK' ? 'PCK'
      : data.productType === 'MATERIAL_VINYL' ? 'VNL'
      : data.productType === 'MATERIAL_LAMINATE' ? 'LMN'
      : data.productType === 'MATERIAL_PACKAGING' ? 'PKG'
      : 'PRD'
    )

    const barcode = generateBarcode()

    // Determine initial stock status
    let stockStatus = 'IN_STOCK'
    if (data.currentStock === 0) stockStatus = 'OUT_OF_STOCK'
    else if (data.currentStock <= data.minStockLevel) stockStatus = 'LOW_STOCK'

    const product = await prisma.product.create({
      data: {
        sku,
        barcode,
        name: data.name,
        description: data.description,
        productType: data.productType as any,
        categoryId: data.categoryId || null,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        currentStock: data.currentStock,
        minStockLevel: data.minStockLevel,
        maxStockLevel: data.maxStockLevel,
        imageUrl: data.imageUrl,
        width: data.width,
        height: data.height,
        unit: data.unit,
        tags: data.tags || [],
        notes: data.notes,
        stockStatus: stockStatus as any,
      },
      include: { category: true },
    })

    // Log initial stock if > 0
    if (data.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          userId: (session.user as any).id,
          type: 'STOCK_IN',
          quantity: data.currentStock,
          previousStock: 0,
          newStock: data.currentStock,
          reason: 'Initial stock on product creation',
        },
      })
    }

    await logActivity({
      userId: (session.user as any).id,
      action: 'CREATE',
      entity: 'product',
      entityId: product.id,
      details: { name: product.name, sku: product.sku },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'SKU or barcode already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 400 })
  }
}
