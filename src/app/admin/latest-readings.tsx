'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Camera, ChevronRight, User, Calendar } from 'lucide-react'
import { readingService } from '@/services/reading-service'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface LatestReading {
  id: string
  customer_name: string
  supply_number: string
  previous_reading: number
  current_reading: number
  consumption: number
  reading_date: string
  has_photo: boolean
}

export function LatestReadings() {
  const [readings, setReadings] = useState<LatestReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    readingService.getLatestReadings()
      .then((data) => {
        if (cancelled) return
        const formattedReadings: LatestReading[] = data?.map((r: any) => ({
          id: r.id,
          customer_name: (r as any).customers?.full_name || 'Desconocido',
          supply_number: (r as any).customers?.supply_number || 'N/A',
          previous_reading: r.previous_reading,
          current_reading: r.current_reading,
          consumption: r.consumption,
          reading_date: r.reading_date,
          has_photo: !!(r as any).photo_url,
        })) || []
        setReadings(formattedReadings)
      })
      .catch(() => {
        if (!cancelled) setError('Error al cargar datos')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} min`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `Hace ${hours} h`
    } else {
      return formatDate(dateString)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Últimas Lecturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Cargando...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            Últimas Lecturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Últimas Lecturas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {readings.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No hay lecturas registradas hoy
          </div>
        ) : (
          readings.map((reading) => (
            <div
              key={reading.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{reading.customer_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{reading.supply_number}</span>
                    {reading.has_photo && (
                      <Badge variant="default" className="text-[10px] px-1">📷</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">{reading.consumption} kWh</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatTimeAgo(reading.reading_date)}</span>
                </div>
              </div>
            </div>
          ))
        )}

        <Button variant="ghost" className="w-full text-sm" render={<Link href="/admin/audit">Ver todas <ChevronRight className="h-4 w-4 ml-1" /></Link>} />
      </CardContent>
    </Card>
  )
}
