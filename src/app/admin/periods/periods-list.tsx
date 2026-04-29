'use client'

import { useState } from 'react'
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
import { Calendar, Lock, Unlock, PlayCircle } from 'lucide-react'
import { periodService } from '@/services/period-service'
import { formatDate } from '@/lib/utils'

export function PeriodsList({ initialPeriods }: { initialPeriods: any[] }) {
  const [periods, setPeriods] = useState(initialPeriods)
  const [loading, setLoading] = useState<string | null>(null)

  const handleClosePeriod = async (id: string) => {
    if (!confirm('¿Estás seguro de cerrar este periodo? Se generarán los recibos para todos los clientes y no se podrán editar más lecturas.')) {
      return
    }

    setLoading(id)
    try {
      await periodService.closePeriod(id)
      setPeriods(prev => 
        prev.map(p => p.id === id ? { ...p, is_closed: true, closed_at: new Date().toISOString() } : p)
      )
    } catch (error) {
      console.error('Error al cerrar periodo:', error)
      alert('Error al cerrar el periodo.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-md border bg-card">
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
                  <Badge variant={period.is_closed ? 'secondary' : 'default'} className="gap-1">
                    {period.is_closed ? (
                      <><Lock className="h-3 w-3" /> Cerrado</>
                    ) : (
                      <><Unlock className="h-3 w-3" /> Abierto</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {!period.is_closed && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-2 border-primary text-primary hover:bg-primary/5"
                      onClick={() => handleClosePeriod(period.id)}
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
    </div>
  )
}
