'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, Package, DollarSign, Hash, Ruler } from 'lucide-react'
import toast from 'react-hot-toast'

const PRODUCT_TYPES = [
  { value: 'INDIVIDUAL_STICKER', label: 'Individual Sticker' },
  { value: 'STICKER_PACK', label: 'Sticker Pack' },
  { value: 'CUSTOM_ORDER', label: 'Custom Order' },
  { value: 'MATERIAL_VINYL', label: 'Vinyl Material' },
  { value: 'MATERIAL_LAMINATE', label: 'Laminate' },
  { value: 'MATERIAL_PACKAGING', label: 'Packaging' },
  { value: 'MATERIAL_INK', label: 'Ink / Consumable' },
  { value: 'MATERIAL_OTHER', label: 'Other Material' },
]

interface Props {
  categories: any[]
  onClose: () => void
  onSuccess: () => void
  initialData?: any
}

export function AddProductModal({ categories, onClose, onSuccess, initialData }: Props) {
  const isEdit = !!initialData

  const [form, setForm] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    productType: initialData?.productType || 'INDIVIDUAL_STICKER',
    categoryId: initialData?.categoryId || '',
    sku: initialData?.sku || '',
    costPrice: initialData?.costPrice ? parseFloat(initialData.costPrice) : 0,
    salePrice: initialData?.salePrice ? parseFloat(initialData.salePrice) : 0,
    currentStock: initialData?.currentStock || 0,
    minStockLevel: initialData?.minStockLevel || 5,
    maxStockLevel: initialData?.maxStockLevel || 100,
    width: initialData?.width || '',
    height: initialData?.height || '',
    unit: initialData?.unit || 'mm',
    notes: initialData?.notes || '',
    imageUrl: initialData?.imageUrl || '',
    tags: initialData?.tags?.join(', ') || '',
  })

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const url = isEdit ? `/api/products/${initialData.id}` : '/api/products'
      const method = isEdit ? 'PATCH' : 'POST'
      return fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json()
          throw new Error(err.error || 'Failed')
        }
        return r.json()
      })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created')
      onSuccess()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      categoryId: form.categoryId || null,
      costPrice: Number(form.costPrice),
      salePrice: Number(form.salePrice),
      currentStock: Number(form.currentStock),
      minStockLevel: Number(form.minStockLevel),
      maxStockLevel: Number(form.maxStockLevel),
      width: form.width ? Number(form.width) : null,
      height: form.height ? Number(form.height) : null,
      tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
    })
  }

  const set = (field: string) => (e: React.ChangeEvent<any>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-[#13131e] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#13131e] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Package className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="font-semibold text-white">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              className="input-base"
              placeholder="e.g. Kawaii Cat Die Cut Sticker"
              required
            />
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Product Type *</label>
              <select value={form.productType} onChange={set('productType')} className="select-base">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Category</label>
              <select value={form.categoryId} onChange={set('categoryId')} className="select-base">
                <option value="">No category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              SKU <span className="text-zinc-600 font-normal">(auto-generated if blank)</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <input
                type="text"
                value={form.sku}
                onChange={set('sku')}
                className="input-base pl-9 font-mono"
                placeholder="STK-0001"
                disabled={isEdit}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cost Price (£)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.costPrice}
                  onChange={set('costPrice')}
                  className="input-base pl-9"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Sale Price (£)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.salePrice}
                  onChange={set('salePrice')}
                  className="input-base pl-9"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Initial Stock</label>
              <input
                type="number"
                min="0"
                value={form.currentStock}
                onChange={set('currentStock')}
                className="input-base"
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Min Stock</label>
              <input
                type="number"
                min="0"
                value={form.minStockLevel}
                onChange={set('minStockLevel')}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Max Stock</label>
              <input
                type="number"
                min="0"
                value={form.maxStockLevel}
                onChange={set('maxStockLevel')}
                className="input-base"
              />
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Width</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.width}
                  onChange={set('width')}
                  className="input-base pl-9"
                  placeholder="50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Height</label>
              <div className="relative">
                <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.height}
                  onChange={set('height')}
                  className="input-base pl-9"
                  placeholder="50"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5">Unit</label>
              <select value={form.unit} onChange={set('unit')} className="select-base">
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">inches</option>
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Image URL</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={set('imageUrl')}
              className="input-base"
              placeholder="https://..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Tags <span className="text-zinc-600 font-normal">(comma separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={set('tags')}
              className="input-base"
              placeholder="kawaii, cat, pastel"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={3}
              className="input-base resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isEdit ? 'Save Changes' : 'Create Product'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
