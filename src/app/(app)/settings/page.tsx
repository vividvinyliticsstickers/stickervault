'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  Settings, Save, Building, DollarSign, Bell,
  Database, RefreshCw, Shield, ChevronRight, CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const isAdmin = (session?.user as any)?.role === 'ADMIN'

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => fetch('/api/settings').then((r) => r.json()),
  })

  const [form, setForm] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Settings saved')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Failed to save'),
  })

  const getValue = (key: string) => {
    if (form[key] !== undefined) return form[key]
    return settings?.find((s: any) => s.key === key)?.value || ''
  }

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = () => {
    const changed = { ...form }
    // Merge defaults
    if (!changed.company_name) changed.company_name = getValue('company_name')
    saveMutation.mutate(changed)
  }

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-40 skeleton rounded-xl" />)}
    </div>
  )

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your StickerVault instance</p>
        </div>
        {isAdmin && (
          <button onClick={handleSave} disabled={saveMutation.isPending} className="btn-primary">
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Business Info */}
      <Section title="Business Information" icon={Building}>
        <Field label="Business Name">
          <input
            type="text"
            value={getValue('company_name')}
            onChange={(e) => set('company_name', e.target.value)}
            className="input-base"
            disabled={!isAdmin}
          />
        </Field>
        <Field label="Timezone">
          <select
            value={getValue('timezone')}
            onChange={(e) => set('timezone', e.target.value)}
            className="select-base"
            disabled={!isAdmin}
          >
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="Europe/Paris">Europe/Paris (CET)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
          </select>
        </Field>
      </Section>

      {/* Currency */}
      <Section title="Currency & Pricing" icon={DollarSign}>
        <Field label="Currency Code">
          <select
            value={getValue('currency')}
            onChange={(e) => {
              set('currency', e.target.value)
              const symbols: Record<string, string> = { GBP: '£', USD: '$', EUR: '€', AUD: 'A$', CAD: 'C$' }
              set('currency_symbol', symbols[e.target.value] || e.target.value)
            }}
            className="select-base"
            disabled={!isAdmin}
          >
            <option value="GBP">GBP — British Pound</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="AUD">AUD — Australian Dollar</option>
            <option value="CAD">CAD — Canadian Dollar</option>
          </select>
        </Field>
        <Field label="Currency Symbol">
          <input
            type="text"
            value={getValue('currency_symbol')}
            onChange={(e) => set('currency_symbol', e.target.value)}
            className="input-base w-24"
            maxLength={3}
            disabled={!isAdmin}
          />
        </Field>
      </Section>

      {/* Stock Alerts */}
      <Section title="Stock Alerts" icon={Bell}>
        <Field label="Low Stock Threshold" hint="Products with stock at or below this are marked Low Stock">
          <input
            type="number"
            min="1"
            value={getValue('low_stock_threshold')}
            onChange={(e) => set('low_stock_threshold', e.target.value)}
            className="input-base w-28"
            disabled={!isAdmin}
          />
        </Field>
      </Section>

      {/* System Info */}
      <Section title="System Information" icon={Database}>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Version', value: 'StickerVault v1.0.0' },
            { label: 'Framework', value: 'Next.js 14 (App Router)' },
            { label: 'Database', value: 'PostgreSQL via Prisma ORM' },
            { label: 'Deployment', value: 'Render.com' },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-zinc-500">{item.label}</span>
              <span className="text-zinc-300 font-mono text-xs">{item.value}</span>
            </div>
          ))}
        </div>
      </Section>

      {!isAdmin && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-sm">
          <Shield className="w-4 h-4 flex-shrink-0" />
          You need Admin access to change settings.
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold text-zinc-300 mb-5 flex items-center gap-2">
        <Icon className="w-4 h-4 text-zinc-600" />
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-400 mb-1.5">{label}</label>
      {hint && <p className="text-xs text-zinc-600 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
