'use client'

import { useAuth } from '@/hooks/use-auth'
import { useCashierShortcuts } from '@/hooks/use-cashier-shortcuts'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { Search, LogOut, Wallet, Receipt, Keyboard } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function CashierLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const pathname = usePathname()
  const [showShortcuts, setShowShortcuts] = useState(false)

  useCashierShortcuts()

  const navItems = [
    { name: 'Cobros', href: '/cashier', icon: Search, shortcut: 'F2' },
    { name: 'Cierre de Caja', href: '/cashier/closure', icon: Wallet, shortcut: 'F3' },
    { name: 'Historial', href: '/cashier/history', icon: Receipt, shortcut: 'F4' },
  ]

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="h-16 bg-muni-blue dark:bg-muni-blue-deep text-white flex items-center justify-between px-8 shadow-md">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-heading font-bold">Ventanilla Curimana</h1>
          <nav className="flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-4 py-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2",
                  pathname === item.href ? "bg-white/20" : "hover:bg-white/10"
                )}
              >
                <item.icon size={16} />
                {item.name}
                <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-white/20 bg-white/10 px-1 font-mono text-[10px] text-white/60">
                  {item.shortcut}
                </kbd>
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors"
            aria-label="Atajos de teclado"
          >
            <Keyboard size={14} />
            Atajos
          </button>
          <ModeToggle />
          <span className="text-sm hidden sm:inline">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-white hover:bg-white/10" aria-label="Cerrar sesión">
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {showShortcuts && (
        <div className="bg-card border-b px-8 py-2 flex items-center gap-6 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Atajos de teclado:</span>
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">F2</kbd> Cobros</span>
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">F3</kbd> Cierre</span>
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">F4</kbd> Historial</span>
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> Buscar</span>
          <span><kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd> Salir del campo</span>
        </div>
      )}

      <main id="main-content" className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
