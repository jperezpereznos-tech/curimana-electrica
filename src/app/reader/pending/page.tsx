'use client'

import { useState, useEffect, useCallback } from 'react'
import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, CheckCircle2, Circle, AlertTriangle, Loader2 } from 'lucide-react'
import { db } from '@/lib/db/dexie'
import Link from 'next/link'

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Circle; className: string }> = {
  pending: { label: 'Pendiente', variant: 'secondary', icon: Circle, className: '' },
  syncing: { label: 'Sincronizando', variant: 'outline', icon: Loader2, className: 'animate-spin' },
  failed: { label: 'Fallido', variant: 'destructive', icon: AlertTriangle, className: '' },
}

export default function PendingReadingsPage() {
  const [pendingReadings, setPendingReadings] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const loadReadings = useCallback(async () => {
    const readings = await db.pending_readings.toArray()
    return readings.map(r => ({
      id: r.id?.toString() || '0',
      supply_number: r.supply_number,
      full_name: r.full_name,
      address: r.address || 'Sin dirección',
      sector: r.sector || 'Sin sector',
      has_photo: !!r.photo_base64,
      status: r.status || 'pending',
      retry_count: r.retry_count || 0,
    }))
  }, [])

  useEffect(() => {
    let cancelled = false
    let intervalId: ReturnType<typeof setInterval>

    const refresh = async () => {
      const formatted = await loadReadings()
      if (!cancelled) setPendingReadings(formatted)
    }

    refresh().catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false)
    })

    intervalId = setInterval(refresh, 5000)

    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)

    return () => {
      cancelled = true
      clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [loadReadings])

  const filteredReadings = pendingReadings.filter(r =>
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.supply_number.includes(searchTerm)
  )

  const failedCount = pendingReadings.filter(r => r.status === 'failed').length
  const completedCount = pendingReadings.filter(r => r.has_photo).length
  const totalCount = pendingReadings.length

  return (
    <ReaderLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Lecturas Pendientes</h2>
          <div className="flex items-center gap-2">
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {failedCount} Fallidas
              </Badge>
            )}
            <Badge variant="secondary" className="text-sm">
              {completedCount}/{totalCount} Completadas
            </Badge>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o suministro..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando lecturas...
          </div>
        ) : filteredReadings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay lecturas pendientes
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReadings.map((reading) => {
              const config = statusConfig[reading.status] || statusConfig.pending
              const StatusIcon = config.icon
              return (
                <Card key={reading.id} className={
                  reading.status === 'failed' ? 'border-red-200 bg-red-50/50' :
                  reading.has_photo ? 'border-green-200 bg-green-50/50' : ''
                }>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {reading.has_photo && reading.status !== 'failed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <StatusIcon className={`h-5 w-5 ${reading.status === 'failed' ? 'text-red-500' : 'text-muted-foreground'} mt-0.5 ${config.className}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{reading.full_name}</p>
                          <span className="text-xs font-mono text-muted-foreground">{reading.supply_number}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{reading.address}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{reading.sector}</Badge>
                            {reading.status !== 'pending' && (
                              <Badge variant={config.variant} className="text-xs">
                                {config.label}
                                {reading.retry_count > 0 && reading.status === 'failed' && ` (${reading.retry_count}x)`}
                              </Badge>
                            )}
                          </div>
                          <Link href={`/reader/new?supply=${reading.supply_number}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              {reading.has_photo ? 'Editar' : 'Tomar Lectura'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </ReaderLayout>
  )
}
