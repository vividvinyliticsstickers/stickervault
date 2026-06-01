'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2, Search, ShoppingCart, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency, cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function CreateOrderModal({ onClose, onSuccess }: Props) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [isCustomOrder, setIsCustomOrder] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [discount, setDiscount] = useState(0)
  const [items, setItems] = useState<Array<{ productId: string; product: any; quantity: number; unitPrice: number }>>([])
  const [productSearch, setProductSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const { data: searchResults } = useQuery({
    queryKey: ['product-search', productSearch],
    queryFn: () => fetch(`/api/products?search=${productSearch}&limit=10`).then((r) => r.json()),
    enabled: productSearch.length > 1,
  })

  const mutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error)
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Order created!')
      onSuccess()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.productId === product.id)
    if (existing) {
      setItems(items.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems([...items, {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice: parseFloat(product.salePrice) || 0,
      }])
    }
    setProductSearch('')
    setShowSearch(false)
  }

  const removeItem = (productId: string) => setItems(items.filter((i) => i.productId !== productId))
  const updateItem = (productId: string, field: 'quantity' | 'unitPrice', value: number) => {
    setItems(items.map((i) => i.productId === productId ? { ...i, [field]: value } : i))
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const total = Math.max(0, subtotal - discount)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) { toast.error('Add at least one item'); return }
    mutation.mutate({
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      notes,
      isCustomOrder,
      dueDate: dueDate || undefined,
      discount: Number(discount),
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-[#13131e] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#13131e] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="font-semibold text-white">Create New Order</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Customer details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-300">Customer Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-zinc-500 mb-1">Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input-base"
                  placeholder="Customer name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Email</label>
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="input-base" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Phone</label>
                <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input-base" placeholder="+44..." />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-zinc-500 mb-1">Address</label>
                <textarea value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} rows={2} className="input-base resize-none" placeholder="Delivery address..." />
              </div>
            </div>
          </div>

          {/* Order options */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-base" />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setIsCustomOrder(!isCustomOrder)}
                  className={cn(
                    'w-10 h-5 rounded-full transition-all cursor-pointer relative',
                    isCustomOrder ? 'bg-purple-600' : 'bg-white/[0.1]'
                  )}
                >
                  <div className={cn('w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all', isCustomOrder ? 'left-5' : 'left-0.5')} />
                </div>
                <span className="text-sm text-zinc-400">Custom order</span>
              </label>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-zinc-300">Order Items</h3>
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                className="btn-secondary py-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Product
              </button>
            </div>

            {/* Product search */}
            {showSearch && (
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input
                    autoFocus
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="input-base pl-9"
                    placeholder="Search products..."
                  />
                </div>
                {searchResults?.products?.length > 0 && (
                  <div className="mt-1 bg-[#1a1a26] border border-white/[0.08] rounded-xl overflow-hidden">
                    {searchResults.products.map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProduct(p)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-zinc-300">{p.name}</p>
                          <p className="text-xs text-zinc-600">{p.sku} · {p.currentStock} in stock</p>
                        </div>
                        <span className="text-sm text-zinc-400">{formatCurrency(p.salePrice)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Items list */}
            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-white/[0.08] rounded-xl">
                <p className="text-sm text-zinc-600">No items added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 font-medium">{item.product.name}</p>
                      <p className="text-xs text-zinc-600">{item.product.sku}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.productId, 'quantity', Number(e.target.value))}
                        className="input-base w-16 text-center text-sm py-1.5 px-2"
                      />
                      <span className="text-zinc-600 text-xs">×</span>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">£</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.productId, 'unitPrice', Number(e.target.value))}
                          className="input-base w-24 text-sm py-1.5 pl-5"
                        />
                      </div>
                      <span className="text-zinc-300 text-sm font-medium w-16 text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <button type="button" onClick={() => removeItem(item.productId)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="text-zinc-300">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-500">Discount (£)</span>
                <div className="relative w-24">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 text-xs">£</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="input-base text-sm py-1 pl-5 text-right"
                  />
                </div>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-white/[0.06]">
                <span className="text-zinc-300">Total</span>
                <span className="text-white">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Order Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-base resize-none" placeholder="Any special instructions..." />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pb-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending || items.length === 0} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
