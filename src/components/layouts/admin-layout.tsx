'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'
import { GlobalSearch } from '@/components/global-search'
import { Breadcrumbs } from '@/components/breadcrumbs'
import {
LayoutDashboard, Users, Zap, Receipt, Wallet,
LogOut, Menu, Calendar, Tag, ClipboardList, MapPin, Shield, BookOpen, Settings,
ChevronLeft, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

type NavItem = { name: string; href: string; icon: typeof LayoutDashboard; exact?: boolean }
type NavGroup = { label: string; items: NavItem[] }

export function AdminLayout({ children }: { children: React.ReactNode }) {
const { signOut, user } = useAuth()
const pathname = usePathname()
const [collapsed, setCollapsed] = useState(false)

const navGroups: NavGroup[] = useMemo(() => [
  {
    label: 'General',
    items: [
      { name: 'Panel', href: '/admin', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    label: 'Gestión',
    items: [
      { name: 'Clientes', href: '/admin/customers', icon: Users },
      { name: 'Sectores', href: '/admin/sectors', icon: MapPin },
      { name: 'Usuarios', href: '/admin/users', icon: Shield },
    ]
  },
  {
    label: 'Operaciones',
    items: [
      { name: 'Lecturas', href: '/admin/readings', icon: BookOpen },
      { name: 'Recibos', href: '/admin/receipts', icon: Receipt },
      { name: 'Pagos', href: '/admin/payments', icon: Wallet },
      { name: 'Periodos', href: '/admin/periods', icon: Calendar },
    ]
  },
  {
    label: 'Configuración',
    items: [
      { name: 'Tarifas', href: '/admin/tariffs', icon: Zap },
      { name: 'Conceptos', href: '/admin/concepts', icon: Tag },
      { name: 'Configuración', href: '/admin/config', icon: Settings },
      { name: 'Auditoría', href: '/admin/audit', icon: ClipboardList },
    ]
  },
], [])

const isActive = (item: { href: string; exact?: boolean }) => {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD'

return (
  <div className="flex h-screen bg-background overflow-hidden">
    <aside className={cn(
      "bg-muni-blue-deep text-white flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out relative",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="h-1 bg-muni-gold flex-shrink-0" />

      <div className={cn("p-4 flex items-center", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <h1 className="text-lg font-heading font-bold leading-tight">Municipalidad Distrital de Curimana</h1>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded bg-muni-canopy/30 flex items-center justify-center font-heading font-bold text-sm text-muni-gold">
            CE
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {group.label}
              </p>
            )}
            {collapsed && <div className="border-t border-white/10 mx-2 mb-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg transition-all",
                    collapsed ? "justify-center px-0 py-2.5" : "space-x-3 px-3 py-2.5",
                    isActive(item)
                      ? "bg-muni-canopy/25 border-l-2 border-muni-gold text-white"
                      : "hover:bg-muni-canopy/10 border-l-2 border-transparent text-white/70 hover:text-white"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {!collapsed && <span className="text-sm">{item.name}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("border-t border-white/10 p-2", collapsed ? "flex justify-center" : "")}>
        <Button
          variant="ghost"
          className={cn(
            "text-white hover:bg-muni-canopy/15 hover:text-white",
            collapsed ? "h-10 w-10 p-0" : "w-full justify-start"
          )}
          onClick={() => signOut()}
          title={collapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut size={20} className={collapsed ? '' : 'mr-3'} />
          {!collapsed && <span>Cerrar Sesión</span>}
        </Button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 h-6 w-6 bg-white dark:bg-card rounded-full border shadow-md flex items-center justify-center text-muni-blue dark:text-foreground hover:bg-muted transition-colors z-20"
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>

    <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 border-b flex items-center justify-between px-8 bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle menu">
            <Menu size={24} />
          </Button>
          <Breadcrumbs />
        </div>
        <div className="flex items-center space-x-4">
          <GlobalSearch />
          <ModeToggle />
          <span className="text-sm font-medium hidden sm:inline">{user?.email}</span>
          <div className="h-8 w-8 rounded-full bg-muni-blue-deep dark:bg-muni-blue flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-8 bg-muted/20">
        {children}
      </div>
    </main>
  </div>
)
}
