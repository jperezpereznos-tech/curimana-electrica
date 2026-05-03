'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/utils'
import { updateCustomerAction } from './actions'
import { EditCustomerDialog } from './edit-customer-dialog'

const PAGE_SIZE = 25

export function CustomersList({ initialCustomers, query, tariffs, sectors }: { initialCustomers: any[], query: string, tariffs: any[], sectors: any[] }) {
  const [searchTerm, setSearchTerm] = useState(query)
  const [actionError, setActionError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const router = useRouter()

  const customers = useMemo(() => initialCustomers, [initialCustomers])
  const totalPages = Math.max(1, Math.ceil(customers.length / PAGE_SIZE))
  const paginated = customers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const msg = isActive ? '¿Estás seguro de dar de baja este cliente?' : '¿Estás seguro de reactivar este cliente?'
    if (!confirm(msg)) return
    setActionError(null)
    try {
      await updateCustomerAction(id, { is_active: isActive } as any)
      router.refresh()
    } catch {
      setActionError(isActive ? 'Error al dar de baja el cliente.' : 'Error al reactivar el cliente.')
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm) {
      router.push(`/admin/customers?q=${encodeURIComponent(searchTerm)}`)
    } else {
      router.push('/admin/customers')
    }
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {actionError}
        </div>
      )}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, suministro o DNI..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button type="submit">Buscar</Button>
      </form>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Suministro</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead>Tarifa</TableHead>
              <TableHead>Deuda</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
        {initialCustomers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No se encontraron clientes.
            </TableCell>
          </TableRow>
        ) : (
          paginated.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono font-bold text-primary">
                    {customer.supply_number}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{customer.full_name}</span>
                      <span className="text-xs text-muted-foreground">{customer.document_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>{customer.sectors?.name || customer.sector || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.tariffs?.name || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={customer.current_debt > 0 ? 'text-destructive font-bold' : 'text-success'}>
                      {formatCurrency(customer.current_debt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? 'default' : 'secondary'}>
                      {customer.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              } />
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Opciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => window.location.href = `/admin/customers/${customer.id}`}>
                  Ver Detalle
                </DropdownMenuItem>
                    <EditCustomerDialog
                      customer={customer}
                      tariffs={tariffs}
                      sectors={sectors}
                      trigger={
                    <DropdownMenuItem onSelect={(e: any) => e.preventDefault()}>
                      Editar
                    </DropdownMenuItem>
                  }
                />
          <DropdownMenuSeparator />
          {customer.is_active ? (
            <DropdownMenuItem className="text-destructive" onClick={() => handleToggleActive(customer.id, false)}>
              Dar de Baja
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleToggleActive(customer.id, true)}>
              Reactivar
            </DropdownMenuItem>
          )}
              </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
      </Table>
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4 border-t">
          <p className="text-sm text-muted-foreground">
            {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, customers.length)} de {customers.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
