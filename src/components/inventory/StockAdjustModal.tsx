'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X, TrendingUp, TrendingDown, RotateCcw, AlertTriangle, ClipboardCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const OPERATIONS = [
  { type: 'STOCK_IN', label: 'Stock In', icon: TrendingUp, color: 'emerald', desc: 'Add stock received' },
  { type: 'STOCK_OUT', label: 'Stock Out', icon: TrendingDown, color: 'amber', desc: 'Remove stock manually' },
  { type: 'ADJUSTMENT', label: 'Set Level', icon: RotateCcw, color: 'blue', desc: 'Set exact stock count' },
  { type: 'DAMAGED', label: 'Damaged', icon: AlertTriangle, color: 'red', desc: 'Mark as damaged/lost' },
  { type: 'AUDIT', label: 'Audit', icon: ClipboardCheck, color: 'purple', desc: 'Audit count result' },
]

interface Props {
  product: any
  onClose: () => void
  onSuccess: () => void
}

export function StockAdjustModal({ product, onClose, onSuccess }: Props) {
  const [opType, setOpType] = useState('STOCK_IN')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error)
        return r.json()
      }),
    onSuccess: () => {
      toast.success('Stock updated successfully')
      onSuccess()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const selectedOp = OPERATIONS.find((o) => o.type === opType)!
  const isAdjust = opType === 'ADJUSTMENT' || opType === 'AUDIT'

  // Preview new stock
  let previewStock = product.currentStock
  if (opType === 'STOCK_IN' || opType === 'RETURNED') previewStock += quantity
  else if (opType === 'STOCK_OUT' || opType === 'DAMAGED') previewStock = Math.max(0, previewStock - quantity)
  else if (isAdjust) previewStock = quantity

  const colorMap: any = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    red: 'bg-red-500/10 border-red-500/30 text-red-300',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      productId: product.id,
      type: opType,
      quantity: Number(quantity),
      reason,
      reference,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#13131e] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Adjust Stock</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{product.name} · {product.sku}</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current / New stock preview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
              <p className="text-xs text-zinc-600 mb-1">Current Stock</p>
              <p className="text-2xl font-bold text-white">{product.currentStock}</p>
            </div>
            <div className={cn('border rounded-xl p-3 text-center transition-all', colorMap[selectedOp.color])}>
              <p className="text-xs opacity-70 mb-1">New Stock</p>
              <p className="text-2xl font-bold">{previewStock}</p>
            </div>
          </div>

          {/* Operation type */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Operation</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OPERATIONS.map((op) => (
                <button
                  key={op.type}
                  type="button"
                  onClick={() => setOpType(op.type)}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                    opType === op.type
                      ? colorMap[op.color]
                      : 'bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:bg-white/[0.05]'
                  )}
                >
                  <op.icon className="w-4 h-4 mb-1.5" />
                  <span className="text-xs font-semibold">{op.label}</span>
                  <span className="text-[10px] opacity-70 mt-0.5">{op.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              {isAdjust ? 'New Stock Level' : 'Quantity'}
            </label>
            <input
              type="number"
              min={isAdjust ? 0 : 1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="input-base text-xl font-bold"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-base"
              placeholder="e.g. Received new batch, damaged in transit..."
            />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Reference <span className="text-zinc-600 font-normal">(PO number, invoice, etc.)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input-base"
              placeholder="PO-2024-001"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="input-base resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Update Stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
