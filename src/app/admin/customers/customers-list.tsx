'use client'

import { useState, useEffect } from 'react'
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
import { Search, MoreHorizontal } from 'lucide-react'
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

export function CustomersList({ initialCustomers, query }: { initialCustomers: any[], query: string }) {
  const [searchTerm, setSearchTerm] = useState(query)
  const [customers, setCustomers] = useState(initialCustomers)
  const [actionError, setActionError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setCustomers(initialCustomers)
  }, [initialCustomers])

  const handleDeactivate = async (id: string) => {
    if (!confirm('¿Estás seguro de dar de baja este cliente?')) return
    setActionError(null)
    try {
      await updateCustomerAction(id, { is_active: false } as any)
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, is_active: false } : c))
    } catch {
      setActionError('Error al dar de baja el cliente.')
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
              customers.map((customer) => (
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
                  <TableCell>{customer.sector}</TableCell>
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
            <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customer.id}?edit=true`)}>
              Editar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => handleDeactivate(customer.id)}>
              Dar de Baja
            </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
