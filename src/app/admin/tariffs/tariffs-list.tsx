'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { TariffWithTiers } from '@/types/views'
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
import { toggleTariffStatusAction, deleteTariffAction } from './actions'
import { formatCurrency } from '@/lib/utils'
import { ConfirmDialog } from '@/components/confirm-dialog'

const EditTariffDialog = dynamic(() => import('./edit-tariff-dialog').then(m => ({ default: m.EditTariffDialog })))

interface TariffsListProps {
  initialTariffs: TariffWithTiers[]
}

export function TariffsList({ initialTariffs }: TariffsListProps) {
  const [tariffs, setTariffs] = useState(initialTariffs)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setActionError(null)
    const result = await toggleTariffStatusAction(id, !currentStatus)
    if (result.success) {
      setTariffs(prev => prev.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t))
    } else {
      setActionError(result.error || 'Error al cambiar estado de la tarifa.')
    }
  }

  const handleDelete = async (id: string) => {
    setActionError(null)
    const result = await deleteTariffAction(id)
    if (result.success) {
      setDeleteTargetId(null)
      setTariffs(prev => prev.filter(t => t.id !== id))
    } else {
      setActionError(result.error || 'Error al eliminar la tarifa. Puede tener clientes asociados.')
    }
  }

  return (
    <div className="rounded-md border bg-card">
      {actionError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-t-lg border-b">
          {actionError}
        </div>
      )}
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
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="pr-3 pb-1 text-left font-medium">De</th>
                    <th className="pr-3 pb-1 text-left font-medium">A</th>
                    <th className="pb-1 text-left font-medium">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {tariff.tariff_tiers
                    .sort((a, b) => a.min_kwh - b.min_kwh)
                    .map((tier) => (
                      <tr key={tier.id} className="border-t border-border/50 first:border-0">
                        <td className="pr-3 py-0.5">{tier.min_kwh}</td>
                        <td className="pr-3 py-0.5">{tier.max_kwh ?? '∞'}</td>
                        <td className="py-0.5">{formatCurrency(tier.price_per_kwh)}/kWh</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </TableCell>
                <TableCell>
                  <Badge variant={tariff.is_active ? 'default' : 'secondary'}>
                    {tariff.is_active ? 'Activa' : 'Inactiva'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <EditTariffDialog
                    tariff={tariff}
                    hideTrigger
                    open={editTargetId === tariff.id}
                    onOpenChange={(isOpen) => {
                      if (!isOpen) setEditTargetId(null)
                    }}
                  />
                  <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              } />
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setEditTargetId(tariff.id)}>
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleStatus(tariff.id, tariff.is_active ?? false)}>
                  {tariff.is_active ? 'Desactivar' : 'Activar'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTargetId(tariff.id)}>Eliminar</DropdownMenuItem>
              </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
  </Table>
    <ConfirmDialog
      open={!!deleteTargetId}
      onOpenChange={(open) => { if (!open) setDeleteTargetId(null) }}
      title="Eliminar Tarifa"
      description="¿Estás seguro de eliminar esta tarifa? Esta acción es irreversible."
      confirmLabel="Eliminar"
      destructive
      onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
    />
  </div>
  )
}
