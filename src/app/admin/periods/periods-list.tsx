'use client'

import { useState, memo } from 'react'
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Calendar, PlayCircle } from 'lucide-react'
import { closePeriodAction } from './actions'
import { formatDate } from '@/lib/utils'
import dynamic from 'next/dynamic'

const ConfirmDialog = dynamic(() => import('@/components/confirm-dialog').then(m => ({ default: m.ConfirmDialog })))
import { toast } from 'sonner'
import type { PeriodRow } from '@/types/views'

function PeriodsListInner({ initialPeriods }: { initialPeriods: PeriodRow[] }) {
  const [periods, setPeriods] = useState(initialPeriods)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null)

  const handleClosePeriod = async (id: string) => {
    setError(null)
    setLoading(id)
    const result = await closePeriodAction(id)
    if (result.success) {
      const data = result.data as { receiptsGenerated?: number; skipped?: number; errors?: string[]; needsReviewWarnings?: string[] } | undefined
      const generated = data?.receiptsGenerated ?? 0
      const skipped = data?.skipped ?? 0
      const perCustomerErrors: string[] = data?.errors ?? []
      const needsReviewWarnings: string[] = data?.needsReviewWarnings ?? []
      setPeriods(prev =>
        prev.map(p => p.id === id ? { ...p, is_closed: true, closed_at: new Date().toISOString() } : p)
      )
      setCloseTargetId(null)
      let msg = `Periodo cerrado. Se generaron ${generated} recibos.`
      if (skipped > 0) msg += ` ${skipped} clientes sin lectura.`
      if (perCustomerErrors.length > 0) msg += ` Errores: ${perCustomerErrors.join('; ')}.`
      if (needsReviewWarnings.length > 0) msg += ` ⚠ ${needsReviewWarnings.length} lectura(s) con reinicio de medidor (consumo=0): suministros ${needsReviewWarnings.join(', ')}.`
      toast.success(msg)
    } else {
      setError(result.error || 'Error al cerrar el periodo.')
      toast.error(result.error || 'Error al cerrar el periodo.')
    }
    setLoading(null)
  }

  return (
    <div className="rounded-md border bg-card">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-t-lg border-b">
          {error}
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Periodo</TableHead>
            <TableHead>Inicio</TableHead>
            <TableHead>Fin</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                No hay periodos registrados.
              </TableCell>
            </TableRow>
          ) : (
            periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="font-bold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {period.name}
                </TableCell>
                <TableCell>{formatDate(period.start_date)}</TableCell>
                <TableCell>{formatDate(period.end_date)}</TableCell>
                <TableCell>
              <StatusBadge status={period.is_closed ? 'closed' : 'open'} type="period" />
                </TableCell>
                <TableCell className="text-right">
                  {!period.is_closed && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 border-primary text-primary hover:bg-primary/5"
                      onClick={() => setCloseTargetId(period.id)}
                      disabled={loading === period.id}
                    >
                      <PlayCircle className="h-4 w-4" />
                      {loading === period.id ? 'Procesando...' : 'Cerrar y Generar Recibos'}
                    </Button>
                  )}
                  {period.is_closed && (
                    <span className="text-xs text-muted-foreground italic">
                      Cerrado el {formatDate(period.closed_at)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <ConfirmDialog
        open={!!closeTargetId}
        onOpenChange={(open) => { if (!open) setCloseTargetId(null) }}
        title="Cerrar Periodo"
        description="¿Estás seguro de cerrar este periodo? Se generarán los recibos para todos los clientes y no se podrán editar más lecturas."
        confirmLabel="Cerrar y Generar Recibos"
        destructive
        onConfirm={() => closeTargetId && handleClosePeriod(closeTargetId)}
      />
    </div>
  )
}
export const PeriodsList = memo(PeriodsListInner)