'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard, Package, ShoppingCart, Printer, BarChart2,
  Users, Settings, LogOut, Sparkles, ScanLine, Boxes, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/production', label: 'Production', icon: Printer },
  { href: '/barcodes', label: 'Barcodes', icon: ScanLine },
  { href: '/reports', label: 'Reports', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface MobileNavProps {
  user: { name?: string; email?: string; role?: string }
}

export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#0d0d14]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
            StickerVault
          </span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/[0.05] text-zinc-400"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-[#0d0d14] border-l border-white/[0.08] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Menu</span>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/20'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                    )}
                  >
                    <item.icon className={cn('w-5 h-5', isActive ? 'text-purple-400' : 'text-zinc-600')} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6 pt-6 border-t border-white/[0.08]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-purple-600/30 flex items-center justify-center text-sm font-bold text-purple-300">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-zinc-600">{user.role}</p>
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d14] border-t border-white/[0.08] flex">
        {navItems.slice(0, 5).map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors',
                isActive ? 'text-purple-400' : 'text-zinc-600'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
