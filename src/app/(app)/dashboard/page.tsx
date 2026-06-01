'use client'

import { useQuery } from '@tanstack/react-query'
import {
  Package, TrendingUp, AlertTriangle, XCircle, ShoppingCart,
  Printer, DollarSign, Activity, ArrowUpRight, ArrowDownRight, RefreshCw
} from 'lucide-react'
import { formatCurrency, formatDateTime, getStockStatusBg, humanizeStatus } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import Link from 'next/link'

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard').then((r) => r.json()),
    refetchInterval: 60000,
  })

  if (isLoading) return <DashboardSkeleton />

  const revenueChange = data.lastMonth.revenue > 0
    ? ((data.thisMonth.revenue - data.lastMonth.revenue) / data.lastMonth.revenue) * 100
    : 0

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your inventory and business</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={data.totalProducts}
          icon={Package}
          color="purple"
          href="/inventory"
        />
        <StatCard
          title="Total Stock"
          value={data.totalStock.toLocaleString()}
          subtitle="units across all products"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Inventory Value"
          value={formatCurrency(data.inventoryValue)}
          subtitle="at cost price"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(data.thisMonth.revenue)}
          subtitle={`${data.thisMonth.orders} orders`}
          icon={ShoppingCart}
          color="amber"
          change={revenueChange}
        />
      </div>

      {/* Alerts Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AlertCard
          title="Low Stock"
          count={data.lowStockCount}
          color="amber"
          icon={AlertTriangle}
          href="/inventory?status=LOW_STOCK"
        />
        <AlertCard
          title="Out of Stock"
          count={data.outOfStockCount}
          color="red"
          icon={XCircle}
          href="/inventory?status=OUT_OF_STOCK"
        />
        <AlertCard
          title="Active Production"
          count={data.activeProductionJobs}
          color="purple"
          icon={Printer}
          href="/production"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Monthly Revenue (6 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
              <Tooltip
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e4e4ef' }}
                formatter={(v: any) => [`£${v.toFixed(2)}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Orders Chart */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Monthly Orders (6 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#e4e4ef' }}
              />
              <Line type="monotone" dataKey="orders" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Table */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">Low Stock Alerts</h3>
            <Link href="/inventory?status=LOW_STOCK" className="text-xs text-purple-400 hover:text-purple-300">View all</Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-zinc-600 text-center py-8">All products are well stocked! 🎉</p>
          ) : (
            <div className="space-y-2">
              {data.lowStockProducts.slice(0, 6).map((p: any) => (
                <Link key={p.id} href={`/inventory/${p.id}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
                  <div>
                    <p className="text-sm text-zinc-300 font-medium">{p.name}</p>
                    <p className="text-xs text-zinc-600">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${getStockStatusBg(p.stockStatus)} text-xs`}>
                      {p.currentStock} left
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-zinc-300">Recent Activity</h3>
            <Activity className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="space-y-2">
            {data.recentActivity.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 py-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium">{log.user?.name}</span>{' '}
                    {log.action.toLowerCase()} {log.entity}
                    {log.details?.name ? `: ${log.details.name}` : ''}
                  </p>
                  <p className="text-[10px] text-zinc-600">{formatDateTime(log.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon: Icon, color, href, change }: any) {
  const colors: any = {
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }

  const Card = href ? Link : 'div'

  return (
    <Card href={href} className="stat-card hover:border-white/[0.1] transition-all">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-zinc-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-display">{value}</p>
      {subtitle && <p className="text-xs text-zinc-600 mt-1">{subtitle}</p>}
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}% vs last month
        </div>
      )}
    </Card>
  )
}

function AlertCard({ title, count, color, icon: Icon, href }: any) {
  const colors: any = {
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-400',
    red: 'border-red-500/20 bg-red-500/5 text-red-400',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
  }

  return (
    <Link href={href} className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] ${colors[color]}`}>
      <Icon className="w-6 h-6 flex-shrink-0" />
      <div>
        <p className="text-2xl font-bold font-display">{count}</p>
        <p className="text-xs opacity-70">{title}</p>
      </div>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 skeleton rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => <div key={i} className="h-64 skeleton rounded-xl" />)}
      </div>
    </div>
  )
}
