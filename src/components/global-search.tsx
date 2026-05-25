'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import {
  LayoutDashboard, Users, Zap, Receipt, Wallet, Calendar, Tag,
  ClipboardList, MapPin, Shield, BookOpen, Settings, Search,
} from 'lucide-react'

const pages = [
  { name: 'Panel', href: '/admin', icon: LayoutDashboard, group: 'General' },
  { name: 'Clientes', href: '/admin/customers', icon: Users, group: 'Gestión' },
  { name: 'Sectores', href: '/admin/sectors', icon: MapPin, group: 'Gestión' },
  { name: 'Usuarios', href: '/admin/users', icon: Shield, group: 'Gestión' },
  { name: 'Lecturas', href: '/admin/readings', icon: BookOpen, group: 'Operaciones' },
  { name: 'Recibos', href: '/admin/receipts', icon: Receipt, group: 'Operaciones' },
  { name: 'Pagos', href: '/admin/payments', icon: Wallet, group: 'Operaciones' },
  { name: 'Periodos', href: '/admin/periods', icon: Calendar, group: 'Operaciones' },
  { name: 'Tarifas', href: '/admin/tariffs', icon: Zap, group: 'Configuración' },
  { name: 'Conceptos', href: '/admin/concepts', icon: Tag, group: 'Configuración' },
  { name: 'Configuración', href: '/admin/config', icon: Settings, group: 'Configuración' },
  { name: 'Auditoría', href: '/admin/audit', icon: ClipboardList, group: 'Configuración' },
]

const groups = ['General', 'Gestión', 'Operaciones', 'Configuración']

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const run = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Buscar página"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title="Navegación rápida" description="Busca una página del sistema">
        <CommandInput placeholder="Buscar página..." />
        <CommandList>
          <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          {groups.map((group) => {
            const items = pages.filter((p) => p.group === group)
            if (!items.length) return null
            return (
              <CommandGroup key={group} heading={group}>
                {items.map((page) => (
                  <CommandItem key={page.href} onSelect={() => run(page.href)}>
                    <page.icon size={16} className="text-muted-foreground" />
                    <span>{page.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </CommandList>
      </CommandDialog>
    </>
  )
}
