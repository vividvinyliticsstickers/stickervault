import prisma from './prisma'

export async function logActivity(params: {
  userId: string
  action: string
  entity: string
  entityId?: string
  details?: Record<string, any>
  ipAddress?: string
}) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    })
  } catch (error) {
    // Non-critical — don't throw
    console.error('Failed to log activity:', error)
  }
}

export async function updateStockLevel(params: {
  productId: string
  userId: string
  type: string
  quantityChange: number
  reference?: string
  reason?: string
  notes?: string
}) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: params.productId },
  })

  const previousStock = product.currentStock
  const newStock = Math.max(0, previousStock + params.quantityChange)

  // Determine stock status
  let stockStatus = 'IN_STOCK'
  if (newStock === 0) stockStatus = 'OUT_OF_STOCK'
  else if (newStock <= product.minStockLevel) stockStatus = 'LOW_STOCK'

  // Update product
  const updated = await prisma.product.update({
    where: { id: params.productId },
    data: {
      currentStock: newStock,
      stockStatus: stockStatus as any,
    },
  })

  // Record movement
  await prisma.stockMovement.create({
    data: {
      productId: params.productId,
      userId: params.userId,
      type: params.type as any,
      quantity: Math.abs(params.quantityChange),
      previousStock,
      newStock,
      reference: params.reference,
      reason: params.reason,
      notes: params.notes,
    },
  })

  return updated
}
