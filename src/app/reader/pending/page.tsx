'use client'

import { useState, useEffect } from 'react'
import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, CheckCircle2, Circle } from 'lucide-react'
import { db } from '@/lib/db/dexie'
import Link from 'next/link'

export default function PendingReadingsPage() {
  const [pendingReadings, setPendingReadings] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPendingReadings()
  }, [])

  const loadPendingReadings = async () => {
    try {
      // Leer de IndexedDB (lecturas guardadas offline)
      const readings = await db.pending_readings.toArray()
      
      const formattedReadings = readings.map(r => ({
        id: r.id?.toString() || '0',
        supply_number: r.supply_number,
        full_name: r.full_name,
        address: r.address || 'Sin dirección',
        sector: r.supply_number || 'Sin sector',
        has_photo: !!r.photo_base64
      }))
      
      setPendingReadings(formattedReadings)
    } catch (error) {
      console.error('Error cargando lecturas pendientes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredReadings = pendingReadings.filter(r =>
    r.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.supply_number.includes(searchTerm)
  )

  const completedCount = pendingReadings.filter(r => r.has_photo).length
  const totalCount = pendingReadings.length

  return (
    <ReaderLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Lecturas Pendientes</h2>
          <Badge variant="secondary" className="text-sm">
            {completedCount}/{totalCount} Completadas
          </Badge>
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
            {filteredReadings.map((reading) => (
              <Card key={reading.id} className={reading.has_photo ? 'border-green-200 bg-green-50/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {reading.has_photo ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
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
                        <Badge variant="outline">{reading.sector}</Badge>
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
            ))}
          </div>
        )}
      </div>
    </ReaderLayout>
  )
}
