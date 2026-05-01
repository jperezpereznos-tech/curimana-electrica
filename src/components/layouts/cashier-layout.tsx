'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Search, LogOut, Wallet, Receipt } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function CashierLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const pathname = usePathname()

  const navItems = [
    { name: 'Cobros', href: '/cashier', icon: Search },
    { name: 'Cierre de Caja', href: '/cashier/closure', icon: Wallet },
    { name: 'Historial', href: '/cashier/history', icon: Receipt },
  ]

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="h-16 bg-muni-blue text-white flex items-center justify-between px-8 shadow-md">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-bold">Ventanilla Curimana</h1>
          <nav className="flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-md transition-colors text-sm font-medium",
                  pathname === item.href ? "bg-white/20" : "hover:bg-white/10"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white hover:bg-white/10" aria-label="Cerrar sesión">
            <LogOut size={20} />
          </Button>
        </div>
      </header>
      <main id="main-content" className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
