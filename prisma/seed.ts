import { PrismaClient, UserRole, ProductType, StockStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

function generateBarcode(): string {
  const prefix = 'SV'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

function generateSKU(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, '0')}`
}

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@stickervault.com' },
    update: {},
    create: {
      email: 'admin@stickervault.com',
      name: 'Admin User',
      password: adminPassword,
      role: UserRole.ADMIN,
    },
  })

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 12)
  await prisma.user.upsert({
    where: { email: 'staff@stickervault.com' },
    update: {},
    create: {
      email: 'staff@stickervault.com',
      name: 'Staff User',
      password: staffPassword,
      role: UserRole.STAFF,
    },
  })

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Die Cut Stickers' },
      update: {},
      create: { name: 'Die Cut Stickers', description: 'Custom shaped stickers', color: '#6366f1' },
    }),
    prisma.category.upsert({
      where: { name: 'Sticker Sheets' },
      update: {},
      create: { name: 'Sticker Sheets', description: 'A5/A4 sticker sheets', color: '#ec4899' },
    }),
    prisma.category.upsert({
      where: { name: 'Holographic' },
      update: {},
      create: { name: 'Holographic', description: 'Holographic vinyl stickers', color: '#8b5cf6' },
    }),
    prisma.category.upsert({
      where: { name: 'Sticker Packs' },
      update: {},
      create: { name: 'Sticker Packs', description: 'Bundled sticker packs', color: '#f59e0b' },
    }),
    prisma.category.upsert({
      where: { name: 'Vinyl Materials' },
      update: {},
      create: { name: 'Vinyl Materials', description: 'Raw vinyl materials', color: '#10b981' },
    }),
    prisma.category.upsert({
      where: { name: 'Packaging' },
      update: {},
      create: { name: 'Packaging', description: 'Packaging supplies', color: '#f97316' },
    }),
  ])

  const [dieCut, sheets, holo, packs, vinylMat, packaging] = categories

  // Create products
  const productData = [
    // Individual stickers
    { sku: generateSKU('STK', 1), name: 'Kawaii Cat Die Cut', type: ProductType.INDIVIDUAL_STICKER, catId: dieCut.id, cost: 0.50, sale: 2.50, stock: 150, min: 20 },
    { sku: generateSKU('STK', 2), name: 'Galaxy Planet Set', type: ProductType.INDIVIDUAL_STICKER, catId: dieCut.id, cost: 0.60, sale: 3.00, stock: 80, min: 15 },
    { sku: generateSKU('STK', 3), name: 'Floral Wreath', type: ProductType.INDIVIDUAL_STICKER, catId: dieCut.id, cost: 0.45, sale: 2.00, stock: 4, min: 20 },
    { sku: generateSKU('STK', 4), name: 'Holographic Rainbow Star', type: ProductType.INDIVIDUAL_STICKER, catId: holo.id, cost: 0.80, sale: 3.50, stock: 0, min: 15 },
    { sku: generateSKU('STK', 5), name: 'Mushroom Cottage', type: ProductType.INDIVIDUAL_STICKER, catId: dieCut.id, cost: 0.55, sale: 2.50, stock: 200, min: 25 },
    // Sticker sheets
    { sku: generateSKU('SHT', 1), name: 'Botanical A5 Sheet', type: ProductType.INDIVIDUAL_STICKER, catId: sheets.id, cost: 1.20, sale: 5.00, stock: 45, min: 10 },
    { sku: generateSKU('SHT', 2), name: 'Pastel Alphabet Sheet', type: ProductType.INDIVIDUAL_STICKER, catId: sheets.id, cost: 1.50, sale: 6.50, stock: 3, min: 10 },
    { sku: generateSKU('SHT', 3), name: 'Holographic Gems A5', type: ProductType.INDIVIDUAL_STICKER, catId: holo.id, cost: 1.80, sale: 7.50, stock: 30, min: 8 },
    // Sticker packs
    { sku: generateSKU('PCK', 1), name: 'Cozy Cottage Pack x10', type: ProductType.STICKER_PACK, catId: packs.id, cost: 3.50, sale: 12.00, stock: 25, min: 5 },
    { sku: generateSKU('PCK', 2), name: 'Space Explorer Pack x8', type: ProductType.STICKER_PACK, catId: packs.id, cost: 3.00, sale: 10.00, stock: 18, min: 5 },
    // Materials
    { sku: generateSKU('VNL', 1), name: 'White Matte Vinyl Roll 30cm', type: ProductType.MATERIAL_VINYL, catId: vinylMat.id, cost: 15.00, sale: 0, stock: 8, min: 3 },
    { sku: generateSKU('VNL', 2), name: 'Holographic Vinyl Roll 30cm', type: ProductType.MATERIAL_VINYL, catId: vinylMat.id, cost: 22.00, sale: 0, stock: 2, min: 3 },
    { sku: generateSKU('LMN', 1), name: 'Gloss Laminate Roll 30cm', type: ProductType.MATERIAL_LAMINATE, catId: vinylMat.id, cost: 12.00, sale: 0, stock: 5, min: 2 },
    { sku: generateSKU('PKG', 1), name: 'Cellophane Bags 100pk', type: ProductType.MATERIAL_PACKAGING, catId: packaging.id, cost: 4.50, sale: 0, stock: 6, min: 2 },
    { sku: generateSKU('PKG', 2), name: 'Cardboard Backing Cards 50pk', type: ProductType.MATERIAL_PACKAGING, catId: packaging.id, cost: 6.00, sale: 0, stock: 1, min: 3 },
  ]

  for (const p of productData) {
    const status = p.stock === 0 ? StockStatus.OUT_OF_STOCK : p.stock <= p.min ? StockStatus.LOW_STOCK : StockStatus.IN_STOCK
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { currentStock: p.stock, stockStatus: status },
      create: {
        sku: p.sku,
        name: p.name,
        productType: p.type,
        categoryId: p.catId,
        costPrice: p.cost,
        salePrice: p.sale,
        currentStock: p.stock,
        minStockLevel: p.min,
        barcode: generateBarcode(),
        stockStatus: status,
      },
    })
  }

  // Default settings
  const settings = [
    { key: 'company_name', value: 'StickerVault' },
    { key: 'currency', value: 'GBP' },
    { key: 'currency_symbol', value: '£' },
    { key: 'low_stock_threshold', value: '10' },
    { key: 'timezone', value: 'Europe/London' },
  ]

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }

  console.log('✅ Seed complete!')
  console.log('📧 Admin: admin@stickervault.com / admin123')
  console.log('📧 Staff: staff@stickervault.com / staff123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
