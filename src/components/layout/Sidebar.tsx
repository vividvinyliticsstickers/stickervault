'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, ShoppingCart, Printer, BarChart2,
  Users, Settings, LogOut, Sparkles, ScanLine, Boxes, Tag, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/production', label: 'Production', icon: Printer },
  { href: '/barcodes', label: 'Barcodes', icon: ScanLine },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
]

const bottomItems = [
  { href: '/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  user: { name?: string; email?: string; role?: string }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex w-60 lg:w-64 flex-col bg-[#0d0d14] border-r border-white/[0.06] flex-shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-white/[0.06]">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
              StickerVault
            </div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Inventory System</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-0.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 py-2 mt-1">
            Main Menu
          </p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                )}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-purple-400' : 'text-zinc-600 group-hover:text-zinc-400')} />
                {item.label}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto text-purple-500/50" />}
              </Link>
            )
          })}
        </div>

        <div className="mt-4 space-y-0.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 py-2">
            Account
          </p>
          {bottomItems.map((item) => {
            if (item.adminOnly && user.role !== 'ADMIN') return null
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                )}
              >
                <item.icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-purple-400' : 'text-zinc-600 group-hover:text-zinc-400')} />
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03]">
          <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-300 flex-shrink-0">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-300 truncate">{user.name}</p>
            <p className="text-[10px] text-zinc-600 truncate">{user.role}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
