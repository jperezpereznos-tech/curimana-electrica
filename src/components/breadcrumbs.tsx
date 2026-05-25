'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

const labelMap: Record<string, string> = {
  admin: 'Admin',
  customers: 'Clientes',
  readings: 'Lecturas',
  receipts: 'Recibos',
  payments: 'Pagos',
  periods: 'Periodos',
  tariffs: 'Tarifas',
  concepts: 'Conceptos',
  sectors: 'Sectores',
  users: 'Usuarios',
  audit: 'Auditoría',
  config: 'Configuración',
  cashier: 'Cajero',
  reader: 'Lector',
  history: 'Historial',
  new: 'Nuevo',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const isLast = i === segments.length - 1
    const isDynamic = seg.startsWith('(') || /^\d+$/.test(seg) || seg.length > 20
    const label = isDynamic ? 'Detalle' : (labelMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1))

    return { label, href, isLast }
  })

  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link href="/admin" className="hover:text-foreground transition-colors" aria-label="Inicio">
        <Home size={14} />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight size={12} className="text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
