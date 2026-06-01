'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  Users, Plus, Shield, User, Eye, EyeOff,
  CheckCircle, XCircle, Clock, Trash2, Edit2, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDateTime, cn } from '@/lib/utils'

const ROLE_COLORS: any = {
  ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  STAFF: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  VIEWER: 'bg-zinc-800 text-zinc-400 border-zinc-700',
}

export default function UsersPage() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  const { data: activityLogs } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => fetch('/api/inventory?limit=30').then((r) => r.json()),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  if ((session?.user as any)?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Shield className="w-12 h-12 text-zinc-700 mb-4" />
        <h2 className="text-lg font-semibold text-zinc-400">Admin Access Required</h2>
        <p className="text-zinc-600 text-sm mt-1">You need admin privileges to manage users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage team access and permissions</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add User</span>
        </button>
      </div>

      {/* Users grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? [...Array(3)].map((_, i) => <div key={i} className="h-40 skeleton rounded-xl" />)
          : users?.map((user: any) => (
              <div key={user.id} className="glass-card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-sm font-bold text-purple-300 flex-shrink-0">
                      {user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{user.name}</p>
                      <p className="text-xs text-zinc-500">{user.email}</p>
                    </div>
                  </div>
                  <span className={`badge ${ROLE_COLORS[user.role]}`}>{user.role}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <div className="flex items-center gap-1">
                    {user.isActive ? (
                      <><CheckCircle className="w-3 h-3 text-emerald-500" /> <span className="text-emerald-500">Active</span></>
                    ) : (
                      <><XCircle className="w-3 h-3 text-red-500" /> <span className="text-red-500">Inactive</span></>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never logged in'}
                  </div>
                </div>

                {/* Actions — don't allow self-deactivation */}
                {user.id !== (session?.user as any)?.id && (
                  <div className="flex gap-2 pt-1 border-t border-white/[0.06]">
                    <button
                      onClick={() => setEditUser(user)}
                      className="btn-secondary flex-1 justify-center text-xs py-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => toggleActive.mutate({ id: user.id, isActive: !user.isActive })}
                      className={cn(
                        'flex-1 justify-center text-xs py-1.5 inline-flex items-center gap-1.5 rounded-lg border transition-all',
                        user.isActive
                          ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                      )}
                    >
                      {user.isActive ? <><XCircle className="w-3.5 h-3.5" /> Deactivate</> : <><CheckCircle className="w-3.5 h-3.5" /> Activate</>}
                    </button>
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* Permissions reference */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-zinc-600" />
          Role Permissions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {[
            {
              role: 'ADMIN', color: 'purple',
              perms: ['Full system access', 'Manage users', 'Delete products/orders', 'View all reports', 'Manage settings'],
            },
            {
              role: 'STAFF', color: 'blue',
              perms: ['View & edit inventory', 'Create & manage orders', 'Manage production jobs', 'Adjust stock', 'View reports'],
            },
            {
              role: 'VIEWER', color: 'zinc',
              perms: ['View inventory', 'View orders', 'View production', 'View reports', 'No edit access'],
            },
          ].map((r) => (
            <div key={r.role} className={`p-4 rounded-xl border ${ROLE_COLORS[r.role]}`}>
              <p className="font-bold mb-2">{r.role}</p>
              <ul className="space-y-1">
                {r.perms.map((p) => (
                  <li key={p} className="flex items-center gap-1.5 opacity-80">
                    <CheckCircle className="w-3 h-3 flex-shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {showCreate && (
        <UserModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ['users'] }) }}
        />
      )}
      {editUser && (
        <UserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => { setEditUser(null); qc.invalidateQueries({ queryKey: ['users'] }) }}
        />
      )}
    </div>
  )
}

function UserModal({ user, onClose, onSuccess }: { user?: any; onClose: () => void; onSuccess: () => void }) {
  const isEdit = !!user
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(user?.role || 'STAFF')
  const [showPw, setShowPw] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: any) => {
      const url = isEdit ? `/api/users/${user.id}` : '/api/users'
      return fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error)
        return r.json()
      })
    },
    onSuccess: () => { toast.success(isEdit ? 'User updated' : 'User created'); onSuccess() },
    onError: (e: any) => toast.error(e.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data: any = { name, email, role }
    if (password) data.password = password
    mutation.mutate(data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#13131e] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-white">{isEdit ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Full Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" required />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-base" required disabled={isEdit} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Password {isEdit && <span className="text-zinc-700">(leave blank to keep current)</span>}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pr-10"
                minLength={8}
                required={!isEdit}
                placeholder={isEdit ? '••••••••' : 'Min 8 characters'}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="select-base">
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1 justify-center">
              {mutation.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isEdit ? 'Save' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
