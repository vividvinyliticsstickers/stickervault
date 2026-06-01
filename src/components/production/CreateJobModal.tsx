'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Plus, Trash2, Search, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export function CreateJobModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState(0)
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [items, setItems] = useState<Array<{ productId: string; product: any; quantity: number }>>([])
  const [productSearch, setProductSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)

  const { data: searchResults } = useQuery({
    queryKey: ['product-search-job', productSearch],
    queryFn: () => fetch(`/api/products?search=${productSearch}&limit=8`).then((r) => r.json()),
    enabled: productSearch.length > 1,
  })

  const mutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error)
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Production job created')
      onSuccess()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const addProduct = (product: any) => {
    const existing = items.find((i) => i.productId === product.id)
    if (existing) {
      setItems(items.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setItems([...items, { productId: product.id, product, quantity: 1 }])
    }
    setProductSearch('')
    setShowSearch(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Job title required'); return }
    mutation.mutate({
      title,
      priority: Number(priority),
      notes,
      dueDate: dueDate || undefined,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#13131e] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#13131e] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <Printer className="w-4 h-4 text-purple-400" />
            </div>
            <h2 className="font-semibold text-white">New Production Job</h2>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Job Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input-base" placeholder="e.g. Kawaii stickers batch #12" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Priority (0 = normal)</label>
              <input type="number" min="0" max="10" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-base" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500">Items to Produce</label>
              <button type="button" onClick={() => setShowSearch(!showSearch)} className="btn-secondary py-1 text-xs">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {showSearch && (
              <div className="mb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                  <input autoFocus type="text" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="input-base pl-9" placeholder="Search products..." />
                </div>
                {searchResults?.products?.length > 0 && (
                  <div className="mt-1 bg-[#1a1a26] border border-white/[0.08] rounded-xl overflow-hidden">
                    {searchResults.products.map((p: any) => (
                      <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left text-sm">
                        <span className="text-zinc-300">{p.name}</span>
                        <span className="text-zinc-600 text-xs">{p.sku}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-white/[0.08] rounded-xl">
                <p className="text-xs text-zinc-600">No items — job will be generic</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300">{item.product.name}</p>
                      <p className="text-xs text-zinc-600">{item.product.sku}</p>
                    </div>
                    <input
                      type="number" min="1" value={item.quantity}
                      onChange={(e) => setItems(items.map((i) => i.productId === item.productId ? { ...i, quantity: Number(e.target.value) } : i))}
                      className="input-base w-16 text-center text-sm py-1.5 px-2"
                    />
                    <button type="button" onClick={() => setItems(items.filter((i) => i.productId !== item.productId))} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input-base resize-none" placeholder="Any special instructions..." />
          </div>

          <div className="flex gap-3 pb-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
