'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart2, Download, FileText, TrendingDown, ShoppingCart,
  Package, ArrowUpDown, Printer, RefreshCw
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

const REPORT_TYPES = [
  { id: 'inventory', label: 'Inventory Report', icon: Package, desc: 'All products with stock levels and values' },
  { id: 'low-stock', label: 'Low Stock Report', icon: TrendingDown, desc: 'Products below minimum stock level' },
  { id: 'orders', label: 'Orders Report', icon: ShoppingCart, desc: 'All orders with customer and value data' },
  { id: 'movements', label: 'Stock Movements', icon: ArrowUpDown, desc: 'All stock in/out movements (last 1000)' },
]

const COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

export default function ReportsPage() {
  const [selected, setSelected] = useState('inventory')

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard-reports'],
    queryFn: () => fetch('/api/dashboard').then((r) => r.json()),
  })

  const { data: products } = useQuery({
    queryKey: ['products-report'],
    queryFn: () => fetch('/api/products?limit=200').then((r) => r.json()),
  })

  // Category distribution for pie chart
  const categoryData = products?.products
    ? Object.entries(
        products.products.reduce((acc: any, p: any) => {
          const name = p.category?.name || 'Uncategorised'
          acc[name] = (acc[name] || 0) + 1
          return acc
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : []

  // Stock status distribution
  const statusData = [
    { name: 'In Stock', value: products?.products?.filter((p: any) => p.stockStatus === 'IN_STOCK').length || 0, color: '#10b981' },
    { name: 'Low Stock', value: products?.products?.filter((p: any) => p.stockStatus === 'LOW_STOCK').length || 0, color: '#f59e0b' },
    { name: 'Out of Stock', value: products?.products?.filter((p: any) => p.stockStatus === 'OUT_OF_STOCK').length || 0, color: '#ef4444' },
  ]

  // Top products by stock value
  const topByValue = products?.products
    ?.map((p: any) => ({
      name: p.name.slice(0, 20),
      value: p.currentStock * parseFloat(p.costPrice),
    }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 8) || []

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Analytics and data exports for your business</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: dashboard?.totalProducts || 0 },
          { label: 'Total Stock Units', value: (dashboard?.totalStock || 0).toLocaleString() },
          { label: 'Inventory Value', value: formatCurrency(dashboard?.inventoryValue || 0) },
          { label: 'Monthly Revenue', value: formatCurrency(dashboard?.thisMonth?.revenue || 0) },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <p className="text-xs text-zinc-600">{s.label}</p>
            <p className="text-xl font-bold text-white mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Revenue — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dashboard?.monthlyStats || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} labelStyle={{ color: '#e4e4ef' }} formatter={(v: any) => [`£${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Stock status */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Stock Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1 mt-2">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-zinc-400">{s.name}</span>
                </div>
                <span className="text-zinc-300 font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category distribution */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Products by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {categoryData.map((_: any, index: number) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top by value */}
        <div className="glass-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Top Products by Stock Value</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topByValue} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v.toFixed(0)}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }} formatter={(v: any) => [`£${v.toFixed(2)}`, 'Value']} />
              <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Export section */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-zinc-600" />
          Export Reports
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REPORT_TYPES.map((report) => (
            <div key={report.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center">
                  <report.icon className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">{report.label}</p>
                  <p className="text-xs text-zinc-600">{report.desc}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <a
                  href={`/api/reports?type=${report.id}&format=csv`}
                  className="btn-secondary py-1.5 px-2.5 text-xs"
                  download
                >
                  CSV
                </a>
                <a
                  href={`/api/reports?type=${report.id}&format=xlsx`}
                  className="btn-secondary py-1.5 px-2.5 text-xs"
                  download
                >
                  Excel
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
