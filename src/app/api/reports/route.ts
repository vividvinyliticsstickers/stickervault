import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import ExcelJS from 'exceljs'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const reportType = searchParams.get('type') || 'inventory'
  const format = searchParams.get('format') || 'csv'

  let data: any[] = []
  let headers: string[] = []
  let filename = 'report'

  switch (reportType) {
    case 'inventory': {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { name: 'asc' },
      })
      headers = ['SKU', 'Name', 'Category', 'Type', 'Stock', 'Min Stock', 'Status', 'Cost Price', 'Sale Price', 'Inventory Value']
      data = products.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category?.name || '',
        Type: p.productType,
        Stock: p.currentStock,
        'Min Stock': p.minStockLevel,
        Status: p.stockStatus,
        'Cost Price': parseFloat(p.costPrice.toString()),
        'Sale Price': parseFloat(p.salePrice.toString()),
        'Inventory Value': (p.currentStock * parseFloat(p.costPrice.toString())).toFixed(2),
      }))
      filename = 'inventory-report'
      break
    }

    case 'low-stock': {
      const products = await prisma.product.findMany({
        where: { stockStatus: { in: ['LOW_STOCK', 'OUT_OF_STOCK'] }, isActive: true },
        include: { category: true },
        orderBy: { currentStock: 'asc' },
      })
      headers = ['SKU', 'Name', 'Category', 'Current Stock', 'Min Stock', 'Status', 'Shortfall']
      data = products.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Category: p.category?.name || '',
        'Current Stock': p.currentStock,
        'Min Stock': p.minStockLevel,
        Status: p.stockStatus,
        Shortfall: Math.max(0, p.minStockLevel - p.currentStock),
      }))
      filename = 'low-stock-report'
      break
    }

    case 'orders': {
      const orders = await prisma.order.findMany({
        include: { items: true, createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      headers = ['Order Number', 'Customer', 'Status', 'Items', 'Subtotal', 'Discount', 'Total', 'Created By', 'Date']
      data = orders.map((o) => ({
        'Order Number': o.orderNumber,
        Customer: o.customerName,
        Status: o.status,
        Items: o.items.length,
        Subtotal: parseFloat(o.subtotal.toString()),
        Discount: parseFloat(o.discount.toString()),
        Total: parseFloat(o.total.toString()),
        'Created By': o.createdBy.name,
        Date: o.createdAt.toISOString().split('T')[0],
      }))
      filename = 'orders-report'
      break
    }

    case 'movements': {
      const movements = await prisma.stockMovement.findMany({
        include: {
          product: { select: { name: true, sku: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      })
      headers = ['Date', 'Product', 'SKU', 'Type', 'Quantity', 'Previous Stock', 'New Stock', 'Reference', 'Reason', 'User']
      data = movements.map((m) => ({
        Date: m.createdAt.toISOString().split('T')[0],
        Product: m.product.name,
        SKU: m.product.sku,
        Type: m.type,
        Quantity: m.quantity,
        'Previous Stock': m.previousStock,
        'New Stock': m.newStock,
        Reference: m.reference || '',
        Reason: m.reason || '',
        User: m.user.name,
      }))
      filename = 'stock-movements-report'
      break
    }
  }

  if (format === 'csv') {
    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers.map((h) => {
          const val = row[h]?.toString() || ''
          return val.includes(',') ? `"${val}"` : val
        }).join(',')
      ),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })
  }

  // Excel format
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'StickerVault'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Report')

  // Style headers
  worksheet.addRow(headers)
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7C3AED' },
  }

  // Add data
  data.forEach((row) => {
    worksheet.addRow(headers.map((h) => row[h]))
  })

  // Auto-width columns
  worksheet.columns.forEach((col) => {
    col.width = Math.min(30, Math.max(10, (col.header?.toString().length || 10) + 5))
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as Buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
    },
  })
}
