'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Plus, Search, Filter, Download, Package, MoreVertical,
  Edit, Trash2, TrendingDown, ArrowUpDown, ScanLine, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { cn, formatCurrency, getStockStatusBg, humanizeStatus } from '@/lib/utils'
import { StockAdjustModal } from '@/components/inventory/StockAdjustModal'
import { AddProductModal } from '@/components/inventory/AddProductModal'

const PRODUCT_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'INDIVIDUAL_STICKER', label: 'Individual Sticker' },
  { value: 'STICKER_PACK', label: 'Sticker Pack' },
  { value: 'CUSTOM_ORDER', label: 'Custom Order' },
  { value: 'MATERIAL_VINYL', label: 'Vinyl Material' },
  { value: 'MATERIAL_LAMINATE', label: 'Laminate' },
  { value: 'MATERIAL_PACKAGING', label: 'Packaging' },
  { value: 'MATERIAL_INK', label: 'Ink' },
  { value: 'MATERIAL_OTHER', label: 'Other Material' },
]

export default function InventoryPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const qc = useQueryClient()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [type, setType] = useState(searchParams.get('type') || '')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, status, type, page],
    queryFn: () => {
      const params = new URLSearchParams({ search, status, type, page: String(page), limit: '25' })
      return fetch(`/api/products?${params}`).then((r) => r.json())
    },
  })

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => fetch('/api/categories').then((r) => r.json()),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Product deleted')
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleDelete = (product: any) => {
    if (confirm(`Delete "${product.name}"? This will hide it from inventory.`)) {
      deleteMutation.mutate(product.id)
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">
            {data?.total ? `${data.total} products` : 'Manage your products and stock'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/barcodes" className="btn-secondary">
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </Link>
          <a href="/api/reports?type=inventory&format=csv" className="btn-secondary">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </a>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Product</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input-base pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="select-base sm:w-44"
        >
          <option value="">All Status</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1) }}
          className="select-base sm:w-44"
        >
          {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table className="table-base">
            <thead>
              <tr>
                <th>Product</th>
                <th className="hidden md:table-cell">SKU</th>
                <th className="hidden lg:table-cell">Category</th>
                <th>Stock</th>
                <th className="hidden sm:table-cell">Cost</th>
                <th className="hidden sm:table-cell">Price</th>
                <th>Status</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j}><div className="h-4 skeleton rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : data?.products?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Package className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No products found</p>
                    <button onClick={() => setShowAdd(true)} className="btn-primary mt-4 mx-auto">
                      <Plus className="w-4 h-4" /> Add first product
                    </button>
                  </td>
                </tr>
              ) : (
                data?.products?.map((product: any) => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} className="w-8 h-8 rounded-lg object-cover" alt="" />
                          ) : (
                            <Package className="w-4 h-4 text-zinc-600" />
                          )}
                        </div>
                        <div>
                          <Link href={`/inventory/${product.id}`} className="font-medium text-zinc-200 hover:text-white transition-colors">
                            {product.name}
                          </Link>
                          <p className="text-xs text-zinc-600 md:hidden">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell font-mono text-xs text-zinc-500">{product.sku}</td>
                    <td className="hidden lg:table-cell">
                      {product.category && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-white/[0.05] text-zinc-400 border border-white/[0.08]">
                          {product.category.name}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-sm font-semibold', product.currentStock === 0 ? 'text-red-400' : product.currentStock <= product.minStockLevel ? 'text-amber-400' : 'text-zinc-200')}>
                          {product.currentStock}
                        </span>
                        <button
                          onClick={() => setAdjustProduct(product)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-purple-400 transition-all text-xs"
                          title="Adjust stock"
                        >
                          <TrendingDown className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell text-zinc-500 text-sm">{formatCurrency(product.costPrice)}</td>
                    <td className="hidden sm:table-cell text-zinc-300 text-sm font-medium">
                      {parseFloat(product.salePrice) > 0 ? formatCurrency(product.salePrice) : <span className="text-zinc-700">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${getStockStatusBg(product.stockStatus)}`}>
                        {humanizeStatus(product.stockStatus)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAdjustProduct(product)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                          title="Adjust stock"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/inventory/${product.id}`}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/[0.06]">
            <p className="text-sm text-zinc-600">
              Page {page} of {data.totalPages} ({data.total} products)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <AddProductModal
          categories={categories || []}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false)
            qc.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSuccess={() => {
            setAdjustProduct(null)
            qc.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      )}
    </div>
  )
}
