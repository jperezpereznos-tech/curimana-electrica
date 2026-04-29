'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Camera, ClipboardList, LogOut, RefreshCcw } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function ReaderLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const pathname = usePathname()

  const navItems = [
    { name: 'Lectura', href: '/reader', icon: Camera },
    { name: 'Pendientes', href: '/reader/pending', icon: ClipboardList },
    { name: 'Sincronizar', href: '/reader/sync', icon: RefreshCcw },
  ]

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col pb-16">
      <header className="h-14 bg-white border-b flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
        <h1 className="font-bold text-muni-blue">Lector Curimana</h1>
        <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-muted-foreground">
          <LogOut size={20} />
        </Button>
      </header>

      <main className="flex-1 p-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="h-16 bg-white border-t flex items-center justify-around fixed bottom-0 left-0 right-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center space-y-1 transition-colors",
              pathname === item.href ? "text-muni-blue" : "text-muted-foreground"
            )}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
