'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Package, CheckCircle, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface Props {
  order: any
  onClose: () => void
}

export function PackingListModal({ order, onClose }: Props) {
  const qc = useQueryClient()
  const [packed, setPacked] = useState<Record<string, boolean>>({})

  const allPacked = order.items.every((item: any) => packed[item.id])

  const completeMutation = useMutation({
    mutationFn: () =>
      fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PACKED' }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Order marked as packed!')
      qc.invalidateQueries({ queryKey: ['orders'] })
      onClose()
    },
  })

  const printPackingList = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Packing List - ${order.orderNumber}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .checkbox { width: 20px; height: 20px; border: 2px solid #ccc; display: inline-block; margin-right: 10px; }
          .total { font-weight: bold; font-size: 15px; margin-top: 12px; text-align: right; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <h1>Packing List — ${order.orderNumber}</h1>
        <div class="meta">
          Customer: ${order.customerName}<br/>
          ${order.customerAddress ? `Address: ${order.customerAddress}<br/>` : ''}
          ${order.notes ? `Notes: ${order.notes}` : ''}
        </div>
        ${order.items.map((item: any) => `
          <div class="item">
            <div>
              <span class="checkbox"></span>
              <strong>${item.product.name}</strong>
              <span style="color: #666; font-size: 12px;"> (${item.product.sku})</span>
            </div>
            <div>
              <strong>Qty: ${item.quantity}</strong>
              &nbsp; £${(item.quantity * parseFloat(item.unitPrice)).toFixed(2)}
            </div>
          </div>
        `).join('')}
        <div class="total">Total: £${parseFloat(order.total).toFixed(2)}</div>
        <script>window.onload = () => { window.print(); }</script>
      </body>
      </html>
    `)
    win.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-[#13131e] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl overflow-hidden">
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-white">Packing List</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{order.orderNumber} · {order.customerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={printPackingList} className="btn-secondary py-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {order.customerAddress && (
            <div className="mb-4 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-zinc-400">
              <p className="text-xs text-zinc-600 mb-1">Ship to:</p>
              <p className="whitespace-pre-line">{order.customerAddress}</p>
            </div>
          )}

          <div className="space-y-2 mb-4">
            {order.items.map((item: any) => (
              <div
                key={item.id}
                onClick={() => setPacked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                  packed[item.id]
                    ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                  packed[item.id] ? 'bg-emerald-500' : 'border-2 border-zinc-600'
                }`}>
                  {packed[item.id] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 font-medium">{item.product.name}</p>
                  <p className="text-xs text-zinc-600">{item.product.sku}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-white">×{item.quantity}</p>
                  <p className="text-xs text-zinc-500">{formatCurrency(item.quantity * parseFloat(item.unitPrice))}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm font-semibold px-1 mb-6">
            <span className="text-zinc-400">{Object.values(packed).filter(Boolean).length}/{order.items.length} packed</span>
            <span className="text-white">{formatCurrency(order.total)}</span>
          </div>

          {order.notes && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300">
              <p className="text-xs text-amber-500 mb-1">Order notes:</p>
              {order.notes}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Close</button>
            <button
              onClick={() => completeMutation.mutate()}
              disabled={!allPacked || completeMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {completeMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Package className="w-4 h-4" /> Mark Packed</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
