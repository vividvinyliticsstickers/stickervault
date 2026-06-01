'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Edit, Trash2, Package, Barcode, QrCode,
  Download, TrendingUp, TrendingDown, ArrowUpDown, Printer,
  Tag, DollarSign, Layers, Clock, AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency, formatDateTime, getStockStatusBg, humanizeStatus, cn } from '@/lib/utils'
import { AddProductModal } from '@/components/inventory/AddProductModal'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import { BarcodeDisplay } from '@/components/barcodes/BarcodeDisplay'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const [showEdit, setShowEdit] = useState(false)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showBarcode, setShowBarcode] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', params.id],
    queryFn: () => fetch(`/api/products/${params.id}`).then((r) => r.json()),
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  })

  if (isLoading) return <div className="animate-pulse space-y-4">
    {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}
  </div>

  if (!product || product.error) return <div className="text-center py-20">
    <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
    <p className="text-zinc-500">Product not found</p>
    <Link href="/inventory" className="btn-primary mt-4 inline-flex">Back to inventory</Link>
  </div>

  const handleDelete = async () => {
    if (!confirm(`Delete "${product.name}"?`)) return
    const r = await fetch(`/api/products/${product.id}`, { method: 'DELETE' })
    if (r.ok) {
      toast.success('Product deleted')
      router.push('/inventory')
    } else toast.error('Failed to delete')
  }

  const movementIcon = (type: string) => {
    if (['STOCK_IN', 'RETURNED'].includes(type)) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
    if (['STOCK_OUT', 'DAMAGED', 'ORDER_FULFILLED'].includes(type)) return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
    return <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/inventory" className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] transition-all">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{product.name}</h1>
          <p className="page-subtitle font-mono">{product.sku}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowBarcode(true)} className="btn-secondary">
            <Barcode className="w-4 h-4" />
            <span className="hidden sm:inline">Barcode</span>
          </button>
          <button onClick={() => setShowAdjust(true)} className="btn-secondary">
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">Adjust</span>
          </button>
          <button onClick={() => setShowEdit(true)} className="btn-primary">
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button onClick={handleDelete} className="btn-danger p-2.5">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details card */}
          <div className="glass-card p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
              <InfoField label="Status">
                <span className={`badge ${getStockStatusBg(product.stockStatus)}`}>
                  {humanizeStatus(product.stockStatus)}
                </span>
              </InfoField>
              <InfoField label="Product Type">
                <span className="text-zinc-300">{humanizeStatus(product.productType)}</span>
              </InfoField>
              <InfoField label="Category">
                <span className="text-zinc-300">{product.category?.name || '—'}</span>
              </InfoField>
              <InfoField label="Cost Price">
                <span className="text-zinc-300 font-semibold">{formatCurrency(product.costPrice)}</span>
              </InfoField>
              <InfoField label="Sale Price">
                <span className="text-zinc-300 font-semibold">
                  {parseFloat(product.salePrice) > 0 ? formatCurrency(product.salePrice) : '—'}
                </span>
              </InfoField>
              <InfoField label="Barcode">
                <span className="font-mono text-xs text-zinc-400">{product.barcode}</span>
              </InfoField>
              {product.width && (
                <InfoField label="Dimensions">
                  <span className="text-zinc-300">{product.width} × {product.height} {product.unit}</span>
                </InfoField>
              )}
              {product.tags?.length > 0 && (
                <InfoField label="Tags">
                  <div className="flex flex-wrap gap-1">
                    {product.tags.map((tag: string) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-white/[0.05] text-xs text-zinc-400 border border-white/[0.06]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </InfoField>
              )}
            </div>
            {product.notes && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-xs text-zinc-600 mb-1">Notes</p>
                <p className="text-sm text-zinc-400">{product.notes}</p>
              </div>
            )}
          </div>

          {/* Stock history */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-600" />
              Stock History
            </h3>
            {product.stockMovements?.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-6">No stock movements yet</p>
            ) : (
              <div className="space-y-1">
                {product.stockMovements?.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                      {movementIcon(m.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-zinc-300">{humanizeStatus(m.type)}</span>
                        {m.reference && <span className="text-xs text-zinc-600 font-mono">{m.reference}</span>}
                        {m.reason && <span className="text-xs text-zinc-600">· {m.reason}</span>}
                      </div>
                      <p className="text-[10px] text-zinc-600">{m.user?.name} · {formatDateTime(m.createdAt)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-bold', ['STOCK_IN', 'RETURNED'].includes(m.type) ? 'text-emerald-400' : ['STOCK_OUT', 'DAMAGED', 'ORDER_FULFILLED'].includes(m.type) ? 'text-red-400' : 'text-blue-400')}>
                        {['STOCK_IN', 'RETURNED'].includes(m.type) ? '+' : ['STOCK_OUT', 'DAMAGED', 'ORDER_FULFILLED'].includes(m.type) ? '-' : '→'}{m.quantity}
                      </div>
                      <div className="text-[10px] text-zinc-600">{m.previousStock} → {m.newStock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Stock level card */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-4">Stock Level</h3>
            <div className="text-center">
              <p className={cn(
                'text-6xl font-bold font-display mb-2',
                product.currentStock === 0 ? 'text-red-400' : product.currentStock <= product.minStockLevel ? 'text-amber-400' : 'text-white'
              )}>
                {product.currentStock}
              </p>
              <p className="text-xs text-zinc-600">units in stock</p>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-600 mb-1">
                <span>0</span>
                <span>Min: {product.minStockLevel}</span>
                <span>Max: {product.maxStockLevel}</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    product.currentStock === 0 ? 'bg-red-500' : product.currentStock <= product.minStockLevel ? 'bg-amber-500' : 'bg-purple-500'
                  )}
                  style={{ width: `${Math.min(100, (product.currentStock / product.maxStockLevel) * 100)}%` }}
                />
              </div>
            </div>

            {product.currentStock <= product.minStockLevel && product.currentStock > 0 && (
              <div className="mt-3 flex items-center gap-2 text-amber-400 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Stock is below minimum level
              </div>
            )}

            <button onClick={() => setShowAdjust(true)} className="btn-primary w-full justify-center mt-4">
              <ArrowUpDown className="w-4 h-4" />
              Adjust Stock
            </button>
          </div>

          {/* Value card */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Inventory Value</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">At cost:</span>
                <span className="text-zinc-300 font-semibold">
                  {formatCurrency(product.currentStock * parseFloat(product.costPrice))}
                </span>
              </div>
              {parseFloat(product.salePrice) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">At retail:</span>
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(product.currentStock * parseFloat(product.salePrice))}
                  </span>
                </div>
              )}
              {parseFloat(product.salePrice) > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-white/[0.06]">
                  <span className="text-zinc-500">Margin:</span>
                  <span className="text-purple-400 font-semibold">
                    {(((parseFloat(product.salePrice) - parseFloat(product.costPrice)) / parseFloat(product.salePrice)) * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="glass-card p-6">
            <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Timeline</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Created:</span>
                <span className="text-zinc-400">{formatDateTime(product.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Updated:</span>
                <span className="text-zinc-400">{formatDateTime(product.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <AddProductModal
          categories={categories || []}
          initialData={product}
          onClose={() => setShowEdit(false)}
          onSuccess={() => {
            setShowEdit(false)
            qc.invalidateQueries({ queryKey: ['product', params.id] })
          }}
        />
      )}
      {showAdjust && (
        <StockAdjustModal
          product={product}
          onClose={() => setShowAdjust(false)}
          onSuccess={() => {
            setShowAdjust(false)
            qc.invalidateQueries({ queryKey: ['product', params.id] })
          }}
        />
      )}
      {showBarcode && (
        <BarcodeDisplay product={product} onClose={() => setShowBarcode(false)} />
      )}
    </div>
  )
}

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-zinc-600 mb-1">{label}</p>
      <div>{children}</div>
    </div>
  )
}
