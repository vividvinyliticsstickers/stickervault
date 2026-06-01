import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateBarcodeBuffer, generateLabelBuffer, generateQRCodeBuffer } from '@/lib/barcode'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'barcode'

  const product = await prisma.product.findUnique({ where: { id: params.id } })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    if (type === 'qr') {
      const buffer = await generateQRCodeBuffer(product.barcode)
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="qr-${product.sku}.png"`,
        },
      })
    }

    if (type === 'label') {
      const result = await generateLabelBuffer({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        salePrice: product.salePrice?.toString(),
      })
      return new NextResponse(result.data, {
        headers: {
          'Content-Type': result.contentType,
          'Content-Disposition': `attachment; filename="label-${product.sku}.svg"`,
        },
      })
    }

    // Default: barcode SVG
    const result = await generateBarcodeBuffer(product.barcode)
    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="barcode-${product.sku}.svg"`,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
