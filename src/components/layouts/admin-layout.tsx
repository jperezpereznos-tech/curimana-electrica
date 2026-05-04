'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Zap,
  Receipt,
  Wallet,
  LogOut,
  Menu,
  Calendar,
  Tag,
  ClipboardList,
  MapPin,
  Shield,
  BookOpen
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth()
  const pathname = usePathname()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const navItems = [
    { name: 'Panel', href: '/admin', icon: LayoutDashboard },
    { name: 'Usuarios', href: '/admin/users', icon: Shield },
    { name: 'Clientes', href: '/admin/customers', icon: Users },
    { name: 'Sectores', href: '/admin/sectors', icon: MapPin },
    { name: 'Lecturas', href: '/admin/readings', icon: BookOpen },
    { name: 'Tarifas', href: '/admin/tariffs', icon: Zap },
    { name: 'Recibos', href: '/admin/receipts', icon: Receipt },
    { name: 'Pagos', href: '/admin/payments', icon: Wallet },
    { name: 'Periodos', href: '/admin/periods', icon: Calendar },
    { name: 'Conceptos', href: '/admin/concepts', icon: Tag },
    { name: 'Auditoria', href: '/admin/audit', icon: ClipboardList },
  ]

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "bg-muni-blue text-white w-64 flex-shrink-0 transition-all duration-300 ease-in-out",
        !isSidebarOpen && "-ml-64"
      )}>
        <div className="p-6">
          <h1 className="text-xl font-bold">Curimana Admin</h1>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                pathname === item.href ? "bg-white/20" : "hover:bg-white/10"
              )}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-8 w-64 px-8">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-white hover:bg-white/10 hover:text-white"
            onClick={() => signOut()}
          >
            <LogOut size={20} className="mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main id="main-content" className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b flex items-center justify-between px-8 bg-white">
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="Toggle menú">
            <Menu size={24} />
          </Button>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium">{user?.email}</span>
            <div className="h-8 w-8 rounded-full bg-muni-blue flex items-center justify-center text-white text-xs">
              AD
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
