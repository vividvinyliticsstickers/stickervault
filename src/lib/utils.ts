import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateBarcode(): string {
  const prefix = 'SV'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export function generateSKU(prefix: string): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substring(2, 4).toUpperCase()
  return `${prefix}-${timestamp}${random}`
}

export function generateOrderNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ORD-${year}${month}${day}-${random}`
}

export function generateJobNumber(): string {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `JOB-${year}${month}-${random}`
}

export function formatCurrency(amount: number | string, symbol = '£'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `${symbol}${num.toFixed(2)}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStockStatusColor(status: string): string {
  switch (status) {
    case 'IN_STOCK': return 'text-emerald-400'
    case 'LOW_STOCK': return 'text-amber-400'
    case 'OUT_OF_STOCK': return 'text-red-400'
    case 'DISCONTINUED': return 'text-zinc-500'
    default: return 'text-zinc-400'
  }
}

export function getStockStatusBg(status: string): string {
  switch (status) {
    case 'IN_STOCK': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'LOW_STOCK': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'OUT_OF_STOCK': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'DISCONTINUED': return 'bg-zinc-800 text-zinc-500 border-zinc-700'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

export function getOrderStatusColor(status: string): string {
  switch (status) {
    case 'DRAFT': return 'bg-zinc-800 text-zinc-400 border-zinc-700'
    case 'PENDING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'CONFIRMED': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'IN_PRODUCTION': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'READY_TO_PACK': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    case 'PACKED': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    case 'DISPATCHED': return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'REFUNDED': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

export function getProductionStatusColor(status: string): string {
  switch (status) {
    case 'QUEUED': return 'bg-zinc-800 text-zinc-400 border-zinc-700'
    case 'READY_TO_PRINT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'PRINTING': return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
    case 'LAMINATING': return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
    case 'CUTTING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'PACKAGING': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'CANCELLED': return 'bg-red-500/10 text-red-400 border-red-500/20'
    default: return 'bg-zinc-800 text-zinc-400 border-zinc-700'
  }
}

export function humanizeStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function calculateInventoryValue(products: Array<{ currentStock: number; costPrice: any }>): number {
  return products.reduce((sum, p) => sum + p.currentStock * parseFloat(p.costPrice?.toString() || '0'), 0)
}
