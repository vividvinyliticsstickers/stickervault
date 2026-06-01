'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Printer, ChevronRight, Clock, Package,
  CheckCircle, XCircle, Layers, Play, Pause
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDate, getProductionStatusColor, humanizeStatus, cn } from '@/lib/utils'
import { CreateJobModal } from '@/components/production/CreateJobModal'

const STAGES = [
  { status: 'QUEUED', label: 'Queue', icon: Clock, color: 'zinc' },
  { status: 'READY_TO_PRINT', label: 'Ready', icon: Play, color: 'blue' },
  { status: 'PRINTING', label: 'Printing', icon: Printer, color: 'purple' },
  { status: 'LAMINATING', label: 'Laminating', icon: Layers, color: 'pink' },
  { status: 'CUTTING', label: 'Cutting', icon: ChevronRight, color: 'amber' },
  { status: 'PACKAGING', label: 'Packaging', icon: Package, color: 'cyan' },
  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle, color: 'emerald' },
]

const NEXT_STATUS: Record<string, string> = {
  QUEUED: 'READY_TO_PRINT',
  READY_TO_PRINT: 'PRINTING',
  PRINTING: 'LAMINATING',
  LAMINATING: 'CUTTING',
  CUTTING: 'PACKAGING',
  PACKAGING: 'COMPLETED',
}

export default function ProductionPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [filterStatus, setFilterStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['production', filterStatus],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100', ...(filterStatus ? { status: filterStatus } : {}) })
      return fetch(`/api/production?${params}`).then((r) => r.json())
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/production/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Job updated')
      qc.invalidateQueries({ queryKey: ['production'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/production/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('Job deleted')
      qc.invalidateQueries({ queryKey: ['production'] })
    },
  })

  const jobs = data?.jobs || []
  const activeJobs = jobs.filter((j: any) => !['COMPLETED', 'CANCELLED'].includes(j.status))

  const jobsByStatus = STAGES.reduce((acc: any, stage) => {
    acc[stage.status] = jobs.filter((j: any) => j.status === stage.status)
    return acc
  }, {})

  const stageColorMap: any = {
    zinc: 'border-zinc-700 bg-zinc-800/40',
    blue: 'border-blue-500/20 bg-blue-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
    pink: 'border-pink-500/20 bg-pink-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
    cyan: 'border-cyan-500/20 bg-cyan-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
  }

  const stageLabelColorMap: any = {
    zinc: 'text-zinc-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    amber: 'text-amber-400',
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Production</h1>
          <p className="page-subtitle">{activeJobs.length} active jobs in progress</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-lg p-1">
            {(['kanban', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize',
                  view === v ? 'bg-purple-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Job</span>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {STAGES.map((stage) => {
          const count = jobsByStatus[stage.status]?.length || 0
          return (
            <button
              key={stage.status}
              onClick={() => setFilterStatus(filterStatus === stage.status ? '' : stage.status)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
                filterStatus === stage.status
                  ? `${stageColorMap[stage.color]} ${stageLabelColorMap[stage.color]}`
                  : 'border-white/[0.06] bg-white/[0.02] text-zinc-600 hover:border-white/[0.1]'
              )}
            >
              <stage.icon className="w-3.5 h-3.5" />
              {stage.label}
              {count > 0 && <span className="bg-white/10 px-1.5 py-0.5 rounded-full">{count}</span>}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 skeleton rounded-xl" />)}
        </div>
      ) : view === 'kanban' ? (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.filter(s => s.status !== 'COMPLETED').map((stage) => {
            const stageJobs = jobsByStatus[stage.status] || []
            return (
              <div key={stage.status} className="flex-shrink-0 w-64">
                <div className={cn('rounded-xl border p-3 min-h-[200px]', stageColorMap[stage.color])}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <stage.icon className={cn('w-4 h-4', stageLabelColorMap[stage.color])} />
                      <span className={cn('text-xs font-semibold', stageLabelColorMap[stage.color])}>
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-xs bg-white/10 text-white px-1.5 py-0.5 rounded-full">
                      {stageJobs.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {stageJobs.map((job: any) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        nextStatus={NEXT_STATUS[job.status]}
                        onAdvance={() => updateMutation.mutate({ id: job.id, status: NEXT_STATUS[job.status] })}
                        onCancel={() => {
                          if (confirm('Cancel this job?')) updateMutation.mutate({ id: job.id, status: 'CANCELLED' })
                        }}
                        onDelete={() => {
                          if (confirm('Delete this job?')) deleteMutation.mutate(job.id)
                        }}
                      />
                    ))}
                    {stageJobs.length === 0 && (
                      <p className="text-xs text-zinc-700 text-center py-4">Empty</p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass-card overflow-hidden">
          <div className="table-container">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Job</th>
                  <th className="hidden md:table-cell">Order</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th className="hidden sm:table-cell">Due</th>
                  <th className="w-24" />
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Printer className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No production jobs</p>
                    </td>
                  </tr>
                ) : jobs.map((job: any) => (
                  <tr key={job.id}>
                    <td>
                      <div>
                        <p className="font-mono text-xs text-purple-400 font-semibold">{job.jobNumber}</p>
                        <p className="text-sm text-zinc-300">{job.title}</p>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-zinc-500 text-sm">
                      {job.order?.orderNumber || '—'}
                    </td>
                    <td>
                      <span className="text-zinc-400 text-sm">{job.items.length} item{job.items.length !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                      <span className={`badge ${getProductionStatusColor(job.status)}`}>
                        {humanizeStatus(job.status)}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell text-zinc-500 text-sm">
                      {job.dueDate ? formatDate(job.dueDate) : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {NEXT_STATUS[job.status] && (
                          <button
                            onClick={() => updateMutation.mutate({ id: job.id, status: NEXT_STATUS[job.status] })}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            title="Advance"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!['COMPLETED', 'CANCELLED'].includes(job.status) && (
                          <button
                            onClick={() => updateMutation.mutate({ id: job.id, status: 'CANCELLED' })}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateJobModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false)
            qc.invalidateQueries({ queryKey: ['production'] })
          }}
        />
      )}
    </div>
  )
}

function JobCard({ job, nextStatus, onAdvance, onCancel, onDelete }: any) {
  return (
    <div className="bg-[#13131e] border border-white/[0.06] rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-purple-400">{job.jobNumber}</p>
          <p className="text-xs text-zinc-300 font-medium mt-0.5 truncate">{job.title}</p>
        </div>
        {job.priority > 0 && (
          <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full flex-shrink-0">
            P{job.priority}
          </span>
        )}
      </div>

      {job.order && (
        <p className="text-[10px] text-zinc-600">{job.order.orderNumber} · {job.order.customerName}</p>
      )}

      <div className="text-xs text-zinc-500">
        {job.items.map((item: any) => (
          <div key={item.id} className="flex justify-between">
            <span className="truncate">{item.product.name}</span>
            <span className="flex-shrink-0 ml-2">×{item.quantity}</span>
          </div>
        ))}
      </div>

      {job.dueDate && (
        <p className="text-[10px] text-zinc-600 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Due {formatDate(job.dueDate)}
        </p>
      )}

      {nextStatus && (
        <button
          onClick={onAdvance}
          className="w-full py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-zinc-300 transition-all flex items-center justify-center gap-1"
        >
          Move to {humanizeStatus(nextStatus)}
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
