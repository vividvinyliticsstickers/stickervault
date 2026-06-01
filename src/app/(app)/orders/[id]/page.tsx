'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Package, User, MapPin, Mail, Phone,
  Calendar, CheckCircle, XCircle, ChevronRight, Printer, Edit2
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatDateTime, getOrderStatusColor, humanizeStatus, cn } from '@/lib/utils'
import { PackingListModal } from '@/components/orders/PackingListModal'

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_PACK', 'PACKED', 'DISPATCHED', 'COMPLETED']

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const qc = useQueryClient()
  const [showPacking, setShowPacking] = useState(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', params.id],
    queryFn: () => fetch(`/api/orders/${params.id}`).then((r) => r.json()),
  })

  const updateMutation = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Order updated')
      qc.invalidateQueries({ queryKey: ['order', params.id] })
    },
  })

  if (isLoading) return <div className="space-y-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="h-32 skeleton rounded-xl" />)}</div>
  if (!order || order.error) return <div className="text-center py-20"><p className="text-zinc-500">Order not found</p></div>

  const currentIdx = STATUS_FLOW.indexOf(order.status)
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null
  const isTerminal = ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)

  const printOrder = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head><title>Order ${order.orderNumber}</title>
      <style>body{font-family:sans-serif;padding:20px;max-width:600px}h1{font-size:20px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f5f5f5}.total{font-weight:bold;font-size:16px;text-align:right;margin-top:8px}</style>
      </head><body>
      <h1>Order ${order.orderNumber}</h1>
      <p><strong>Customer:</strong> ${order.customerName}</p>
      ${order.customerEmail ? `<p><strong>Email:</strong> ${order.customerEmail}</p>` : ''}
      ${order.customerAddress ? `<p><strong>Address:</strong> ${order.customerAddress}</p>` : ''}
      <p><strong>Status:</strong> ${order.status}</p>
      <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
      <table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
      ${order.items.map((i: any) => `<tr><td>${i.product.name}</td><td>${i.product.sku}</td><td>${i.quantity}</td><td>£${parseFloat(i.unitPrice).toFixed(2)}</td><td>£${parseFloat(i.totalPrice).toFixed(2)}</td></tr>`).join('')}
      </tbody></table>
      ${parseFloat(order.discount) > 0 ? `<p class="total">Discount: -£${parseFloat(order.discount).toFixed(2)}</p>` : ''}
      <p class="total">Total: £${parseFloat(order.total).toFixed(2)}</p>
      ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
      <script>window.onload=()=>window.print()</script></body></html>
    `)
    win.document.close()
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/orders" className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title">{order.orderNumber}</h1>
            {order.isCustomOrder && <span className="badge bg-pink-500/10 text-pink-400 border-pink-500/20">Custom</span>}
            <span className={`badge ${getOrderStatusColor(order.status)}`}>{humanizeStatus(order.status)}</span>
          </div>
          <p className="page-subtitle">Created {formatDateTime(order.createdAt)} by {order.createdBy?.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={printOrder} className="btn-secondary">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
          {order.status === 'READY_TO_PACK' && (
            <button onClick={() => setShowPacking(true)} className="btn-secondary">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Pack</span>
            </button>
          )}
        </div>
      </div>

      {/* Status pipeline */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const done = currentIdx > i
            const current = currentIdx === i
            const future = currentIdx < i
            return (
              <div key={s} className="flex items-center gap-1 flex-shrink-0">
                <div className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  done ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  current ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' :
                  'bg-white/[0.03] border-white/[0.06] text-zinc-600'
                )}>
                  {done && <CheckCircle className="inline w-3 h-3 mr-1" />}
                  {humanizeStatus(s)}
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <ChevronRight className={cn('w-3 h-3 flex-shrink-0', done ? 'text-emerald-600' : 'text-zinc-700')} />
                )}
              </div>
            )
          })}
        </div>

        {!isTerminal && nextStatus && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-white/[0.06]">
            <button
              onClick={() => updateMutation.mutate(nextStatus)}
              disabled={updateMutation.isPending}
              className="btn-primary"
            >
              <ChevronRight className="w-4 h-4" />
              Advance to {humanizeStatus(nextStatus)}
            </button>
            <button
              onClick={() => { if (confirm('Cancel this order?')) updateMutation.mutate('CANCELLED') }}
              className="btn-danger"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-zinc-300">Order Items ({order.items.length})</h3>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {order.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                    {item.product.imageUrl
                      ? <img src={item.product.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      : <Package className="w-5 h-5 text-zinc-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 font-medium">{item.product.name}</p>
                    <p className="text-xs text-zinc-600 font-mono">{item.product.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-zinc-300">×{item.quantity} @ {formatCurrency(item.unitPrice)}</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(item.totalPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Totals */}
            <div className="p-4 border-t border-white/[0.06] space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Subtotal</span>
                <span className="text-zinc-300">{formatCurrency(order.subtotal)}</span>
              </div>
              {parseFloat(order.discount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Discount</span>
                  <span className="text-red-400">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-white/[0.06]">
                <span className="text-zinc-300">Total</span>
                <span className="text-white">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="glass-card p-4">
              <p className="text-xs text-zinc-600 mb-1">Order Notes</p>
              <p className="text-sm text-zinc-300">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Customer info */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-4">Customer</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-600/20 flex items-center justify-center text-sm font-bold text-purple-300">
                  {order.customerName[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{order.customerName}</p>
                </div>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Mail className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  <span className="break-all">{order.customerEmail}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Phone className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  {order.customerPhone}
                </div>
              )}
              {order.customerAddress && (
                <div className="flex items-start gap-2 text-sm text-zinc-400">
                  <MapPin className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                  <span className="whitespace-pre-line">{order.customerAddress}</span>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Timeline</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Created</span>
                <span className="text-zinc-400">{formatDate(order.createdAt)}</span>
              </div>
              {order.dueDate && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Due Date</span>
                  <span className="text-zinc-400">{formatDate(order.dueDate)}</span>
                </div>
              )}
              {order.packedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Packed</span>
                  <span className="text-zinc-400">{formatDate(order.packedAt)}</span>
                </div>
              )}
              {order.dispatchedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Dispatched</span>
                  <span className="text-zinc-400">{formatDate(order.dispatchedAt)}</span>
                </div>
              )}
              {order.completedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Completed</span>
                  <span className="text-emerald-400">{formatDate(order.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {order.productionJob && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Production Job</h3>
              <p className="text-sm font-mono text-purple-400">{order.productionJob.jobNumber}</p>
              <span className={`badge mt-1 ${
                order.productionJob.status === 'COMPLETED'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}>
                {humanizeStatus(order.productionJob.status)}
              </span>
            </div>
          )}
        </div>
      </div>

      {showPacking && <PackingListModal order={order} onClose={() => setShowPacking(false)} />}
    </div>
  )
}
