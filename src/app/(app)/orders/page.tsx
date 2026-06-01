'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, ShoppingCart, Eye, Edit2, Trash2,
  Download, CheckCircle, XCircle, Clock, Package
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, getOrderStatusColor, humanizeStatus } from '@/lib/utils'
import { CreateOrderModal } from '@/components/orders/CreateOrderModal'
import { PackingListModal } from '@/components/orders/PackingListModal'

const ORDER_STATUSES = [
  { value: '', label: 'All Orders' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PRODUCTION', label: 'In Production' },
  { value: 'READY_TO_PACK', label: 'Ready to Pack' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_PACK', 'PACKED', 'DISPATCHED', 'COMPLETED']

export default function OrdersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [packingOrder, setPackingOrder] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['orders', search, status, page],
    queryFn: () => {
      const params = new URLSearchParams({ search, status, page: String(page), limit: '20' })
      return fetch(`/api/orders?${params}`).then((r) => r.json())
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Order updated')
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/orders/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Order deleted')
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  const advanceStatus = (order: any) => {
    const currentIdx = STATUS_FLOW.indexOf(order.status)
    if (currentIdx < STATUS_FLOW.length - 1) {
      updateMutation.mutate({ id: order.id, status: STATUS_FLOW[currentIdx + 1] })
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">{data?.total ? `${data.total} orders` : 'Manage customer orders'}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/reports?type=orders&format=csv" className="btn-secondary">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </a>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Order</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending', status: 'PENDING', color: 'amber' },
          { label: 'In Production', status: 'IN_PRODUCTION', color: 'purple' },
          { label: 'Ready to Pack', status: 'READY_TO_PACK', color: 'cyan' },
          { label: 'Completed', status: 'COMPLETED', color: 'emerald' },
        ].map((s) => {
          const count = data?.orders?.filter((o: any) => o.status === s.status).length || 0
          return (
            <button
              key={s.status}
              onClick={() => setStatus(status === s.status ? '' : s.status)}
              className={`glass-card p-3 text-left transition-all hover:border-white/[0.12] ${status === s.status ? 'border-purple-500/30' : ''}`}
            >
              <p className="text-xs text-zinc-500">{s.label}</p>
              <p className="text-2xl font-bold font-display text-white">{count}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="input-base pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="select-base sm:w-48"
        >
          {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Orders table */}
      <div className="glass-card overflow-hidden">
        <div className="table-container">
          <table className="table-base">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th className="hidden md:table-cell">Items</th>
                <th className="hidden sm:table-cell">Total</th>
                <th>Status</th>
                <th className="hidden lg:table-cell">Date</th>
                <th className="w-32" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => <td key={j}><div className="h-4 skeleton rounded" /></td>)}
                  </tr>
                ))
              ) : data?.orders?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <ShoppingCart className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500">No orders found</p>
                    <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 mx-auto">
                      <Plus className="w-4 h-4" /> Create first order
                    </button>
                  </td>
                </tr>
              ) : (
                data?.orders?.map((order: any) => (
                  <tr key={order.id}>
                    <td>
                      <div>
                        <Link href={`/orders/${order.id}`} className="font-mono text-sm text-purple-400 hover:text-purple-300 transition-colors font-semibold">
                          {order.orderNumber}
                        </Link>
                        {order.isCustomOrder && (
                          <span className="ml-2 text-[10px] bg-pink-500/10 text-pink-400 border border-pink-500/20 px-1.5 py-0.5 rounded-full">Custom</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm text-zinc-300">{order.customerName}</p>
                        {order.customerEmail && <p className="text-xs text-zinc-600 hidden sm:block">{order.customerEmail}</p>}
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <span className="text-zinc-400 text-sm">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className="text-zinc-300 font-semibold text-sm">{formatCurrency(order.total)}</span>
                    </td>
                    <td>
                      <span className={`badge ${getOrderStatusColor(order.status)}`}>
                        {humanizeStatus(order.status)}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell text-zinc-500 text-sm">{formatDate(order.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {/* Advance status */}
                        {!['COMPLETED', 'CANCELLED'].includes(order.status) && (
                          <button
                            onClick={() => advanceStatus(order)}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            title="Advance status"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {order.status === 'READY_TO_PACK' && (
                          <button
                            onClick={() => setPackingOrder(order)}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                            title="Packing list"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Link href={`/orders/${order.id}`} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {!['COMPLETED', 'DISPATCHED'].includes(order.status) && (
                          <button
                            onClick={() => {
                              if (confirm('Cancel this order?')) {
                                updateMutation.mutate({ id: order.id, status: 'CANCELLED' })
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data?.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-white/[0.06]">
            <p className="text-sm text-zinc-600">Page {page} of {data.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs">Previous</button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="btn-secondary py-1.5 px-3 text-xs">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            qc.invalidateQueries({ queryKey: ['orders'] })
          }}
        />
      )}
      {packingOrder && (
        <PackingListModal order={packingOrder} onClose={() => setPackingOrder(null)} />
      )}
    </div>
  )
}
