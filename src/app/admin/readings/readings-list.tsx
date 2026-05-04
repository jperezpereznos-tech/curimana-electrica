'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
} from '@/components/ui/select'
import {
  AlertTriangle, Camera, Search, ChevronLeft, ChevronRight, Eye, Pencil,
  AlertCircle, CheckCircle2, User, MapPin,
} from 'lucide-react'
import { getReadingsAdminAction, updateReadingAction } from './actions'
import { ReadingEditDialog } from './reading-edit-dialog'

const PAGE_SIZE = 25

function formatDate(d: string | null | undefined) {
  if (!d) return '-'
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(d))
}

interface ReadingRow {
  id: string
  customer_id: string
  billing_period_id: string
  previous_reading: number
  current_reading: number
  consumption: number
  needs_review: boolean
  reading_date: string | null
  photo_url: string | null
  notes: string | null
  meter_reader_id: string | null
  created_at: string | null
  customers: { full_name: string; supply_number: string; sector_id: string | null; sectors: { id: string; name: string; code: string } | null } | null
  profiles: { id: string; full_name: string } | null
}

export function ReadingsList({
  initialReadings,
  periods,
  initialReviewCount,
}: {
  initialReadings: any[]
  periods: any[]
  initialReviewCount: number
}) {
  const [readings, setReadings] = useState<ReadingRow[]>(initialReadings)
  const [filter, setFilter] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [showReviewOnly, setShowReviewOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [reviewCount, setReviewCount] = useState(initialReviewCount)
  const [isPending, startTransition] = useTransition()
  const [selectedReading, setSelectedReading] = useState<ReadingRow | null>(null)
  const [editReading, setEditReading] = useState<ReadingRow | null>(null)

  const refreshReadings = (periodId?: string, reviewOnly?: boolean) => {
    startTransition(async () => {
      const result = await getReadingsAdminAction(
        periodId || undefined,
        reviewOnly || undefined
      )
      if (result.data) {
        setReadings(result.data as ReadingRow[])
      }
    })
  }

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    setPage(1)
    refreshReadings(value, showReviewOnly)
  }

  const handleReviewFilterToggle = () => {
    const newVal = !showReviewOnly
    setShowReviewOnly(newVal)
    setPage(1)
    refreshReadings(selectedPeriod, newVal)
  }

  const handleReadingUpdated = () => {
    setEditReading(null)
    refreshReadings(selectedPeriod, showReviewOnly)
    setReviewCount(prev => Math.max(0, prev - 1))
  }

  const filtered = readings.filter(r => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      r.customers?.full_name?.toLowerCase().includes(q) ||
      r.customers?.supply_number?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q) ||
      r.profiles?.full_name?.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        {reviewCount > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {reviewCount} por revisar
          </Badge>
        )}

        <Button
          variant={showReviewOnly ? 'default' : 'outline'}
          size="sm"
          onClick={handleReviewFilterToggle}
          className="gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          {showReviewOnly ? 'Mostrando revisiones' : 'Solo revisión'}
        </Button>

        <div className="flex-1" />

        <div className="relative w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, suministro..."
            className="pl-8 h-8 text-sm"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
          />
        </div>

        <select
          className="h-8 rounded-md border bg-background px-3 text-sm"
          value={selectedPeriod}
          onChange={(e) => handlePeriodChange(e.target.value)}
        >
          <option value="">Todos los periodos</option>
          {periods.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.month}/{p.year} {p.is_closed ? '(Cerrado)' : '(Activo)'}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Suministro</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead className="text-right">Anterior</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Consumo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Lecturador</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    {isPending ? 'Cargando...' : 'No hay lecturas registradas'}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((r) => (
                  <TableRow key={r.id} className={r.needs_review ? 'bg-amber-50/50' : ''}>
                    <TableCell className="font-mono text-xs">{r.customers?.supply_number || '-'}</TableCell>
                    <TableCell className="font-medium text-sm">{r.customers?.full_name || '-'}</TableCell>
                    <TableCell>
                      {r.customers?.sectors ? (
                        <Badge variant="outline" className="text-xs">{r.customers.sectors.code}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.previous_reading}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{r.current_reading}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-bold">{r.consumption} kWh</TableCell>
                    <TableCell className="text-xs">{formatDate(r.reading_date)}</TableCell>
                    <TableCell className="text-xs">
                      {r.profiles?.full_name ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {r.profiles.full_name}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {r.needs_review && (
                          <Badge variant="destructive" className="text-[10px] gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Revisar
                          </Badge>
                        )}
                        {r.photo_url && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5">
                            <Camera className="h-2.5 w-2.5" />
                            Foto
                          </Badge>
                        )}
                        {!r.needs_review && !r.photo_url && (
                          <Badge variant="outline" className="text-[10px]">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                            OK
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.photo_url && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedReading(r)}
                            title="Ver foto"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditReading(r)}
                          title="Editar lectura"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between py-4 px-4 border-t">
              <p className="text-sm text-muted-foreground">
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
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
        </CardContent>
      </Card>

      {selectedReading && (
        <Dialog open onOpenChange={() => setSelectedReading(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Foto de Lectura</DialogTitle>
              <DialogDescription>
                {selectedReading.customers?.full_name} — {selectedReading.customers?.supply_number}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <img
                src={selectedReading.photo_url!}
                alt="Foto del medidor"
                className="w-full rounded-lg border"
              />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Anterior</p>
                  <p className="font-mono font-bold">{selectedReading.previous_reading}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actual</p>
                  <p className="font-mono font-bold">{selectedReading.current_reading}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consumo</p>
                  <p className="font-mono font-bold">{selectedReading.consumption} kWh</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha</p>
                  <p className="font-medium">{formatDate(selectedReading.reading_date)}</p>
                </div>
              </div>
              {selectedReading.notes && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Notas</p>
                  <p>{selectedReading.notes}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {editReading && (
        <ReadingEditDialog
          reading={editReading}
          onClose={() => setEditReading(null)}
          onUpdated={handleReadingUpdated}
        />
      )}
    </div>
  )
}
