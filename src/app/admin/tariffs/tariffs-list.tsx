'use client'

import { useState } from 'react'
import { TariffWithTiers } from '@/repositories/tariff-repository'
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
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tariffService } from '@/services/tariff-service'
import { formatCurrency } from '@/lib/utils'

interface TariffsListProps {
  initialTariffs: TariffWithTiers[]
}

export function TariffsList({ initialTariffs }: TariffsListProps) {
  const [tariffs, setTariffs] = useState(initialTariffs)

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await tariffService.toggleTariffStatus(id, !currentStatus)
      setTariffs(prev =>
        prev.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t)
      )
    } catch (error) {
      console.error('Error al cambiar estado:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarifa? Esta acción es irreversible.')) return
    try {
      await tariffService.deleteTariff(id)
      setTariffs(prev => prev.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error al eliminar tarifa:', error)
      alert('Error al eliminar la tarifa. Puede tener clientes asociados.')
    }
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Conexión</TableHead>
            <TableHead>Tramos</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tariffs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay tarifas registradas.
              </TableCell>
            </TableRow>
          ) : (
            tariffs.map((tariff) => (
              <TableRow key={tariff.id}>
                <TableCell className="font-medium">{tariff.name}</TableCell>
                <TableCell className="capitalize">{tariff.connection_type}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-xs">
                    {tariff.tariff_tiers
                      .sort((a, b) => a.min_kwh - b.min_kwh)
                      .map((tier) => (
                        <span key={tier.id}>
                          {tier.min_kwh} - {tier.max_kwh ?? '+'} kWh: {formatCurrency(tier.price_per_kwh)}
                        </span>
                      ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={tariff.is_active ? 'default' : 'secondary'}>
                    {tariff.is_active ? 'Activa' : 'Inactiva'}
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
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleToggleStatus(tariff.id, tariff.is_active ?? false)}>
              {tariff.is_active ? 'Desactivar' : 'Activar'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tariff.id)}>Eliminar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
