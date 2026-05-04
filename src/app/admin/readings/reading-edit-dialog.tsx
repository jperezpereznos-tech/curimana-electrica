'use client'

import { useState, useTransition } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { updateReadingAction } from './actions'

interface ReadingRow {
  id: string
  previous_reading: number
  current_reading: number
  consumption: number
  needs_review: boolean
  notes: string | null
  customers: { full_name: string; supply_number: string } | null
}

export function ReadingEditDialog({
  reading,
  onClose,
  onUpdated,
}: {
  reading: ReadingRow
  onClose: () => void
  onUpdated: () => void
}) {
  const [currentReading, setCurrentReading] = useState(String(reading.current_reading))
  const [previousReading, setPreviousReading] = useState(String(reading.previous_reading))
  const [needsReview, setNeedsReview] = useState(reading.needs_review)
  const [notes, setNotes] = useState(reading.notes || '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const prev = Number(previousReading)
  const curr = Number(currentReading)
  const consumption = curr < prev ? 0 : curr - prev
  const isMeterReset = curr < prev

  const handleSave = () => {
    if (isNaN(curr) || isNaN(prev)) {
      setError('Valores inválidos')
      return
    }

    startTransition(async () => {
      const result = await updateReadingAction(reading.id, {
        current_reading: curr,
        previous_reading: prev,
        needs_review: needsReview,
        notes: notes || undefined,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onUpdated()
      }
    })
  }

  const handleApprove = () => {
    startTransition(async () => {
      const result = await updateReadingAction(reading.id, {
        needs_review: false,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onUpdated()
      }
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Lectura</DialogTitle>
          <DialogDescription>
            {reading.customers?.full_name} — {reading.customers?.supply_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {reading.needs_review && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700">Lectura marcada para revisión (posible reinicio de medidor)</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Lectura Anterior</label>
              <Input
                type="number"
                value={previousReading}
                onChange={(e) => { setPreviousReading(e.target.value); setError(null) }}
                className="font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Lectura Actual</label>
              <Input
                type="number"
                value={currentReading}
                onChange={(e) => { setCurrentReading(e.target.value); setError(null) }}
                className="font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Consumo calculado</span>
              <span className="font-mono font-bold text-lg">{consumption} kWh</span>
            </div>
            {isMeterReset && (
              <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                <AlertTriangle className="h-3 w-3" />
                Reinicio de medidor — consumo = 0
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones..."
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Requiere revisión</label>
            <Button
              variant={needsReview ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setNeedsReview(!needsReview)}
            >
              {needsReview ? 'Sí' : 'No'}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          {reading.needs_review && (
            <Button
              variant="outline"
              onClick={handleApprove}
              disabled={isPending}
              className="gap-1"
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprobar
            </Button>
          )}
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
