import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0b10]">
      {/* Desktop Sidebar */}
      <Sidebar user={session.user as any} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile nav */}
        <MobileNav user={session.user as any} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
