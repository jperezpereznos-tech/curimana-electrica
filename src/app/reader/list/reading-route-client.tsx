'use client'

import { useState, useEffect } from 'react'
import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Users, ChevronRight } from 'lucide-react'
import { customerService } from '@/services/customer-service'
import Link from 'next/link'

interface AssignedSector {
  id: string
  name: string
  code: string
}

export function ReadingRouteClient({ assignedSector }: { assignedSector: AssignedSector | null }) {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    customerService.getActiveCustomersWithReadings(assignedSector?.id || undefined)
      .then((data) => {
        if (cancelled) return
        const formatted = data?.map((c: any) => ({
          id: c.id,
          supply_number: c.supply_number,
          full_name: c.full_name,
          address: c.address,
          sector: c.sectors?.name || c.sector || 'Sin Sector',
          sector_id: c.sector_id || c.sectors?.id || null,
          is_active: c.is_active,
          last_reading: c.readings && c.readings.length > 0
            ? c.readings[c.readings.length - 1].reading_date
            : null
        })) || []

        setCustomers(formatted)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [assignedSector])

  const completedCount = customers.filter(c => c.last_reading).length
  const pendingCount = customers.filter(c => !c.last_reading).length

  return (
    <ReaderLayout>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Ruta de Lectura</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{customers.length} suministros</span>
          </div>
        </div>

        {assignedSector && (
          <Badge variant="outline" className="w-fit text-sm">
            <MapPin className="h-3 w-3 mr-1" />
            {assignedSector.name} ({assignedSector.code})
          </Badge>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando ruta...
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {assignedSector ? 'No hay suministros en su sector asignado' : 'No hay suministros disponibles'}
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer, index) => (
              <Card
                key={customer.id}
                className={`hover:border-primary/50 transition-colors ${
                  customer.last_reading ? 'border-green-200 bg-green-50/30' : ''
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-mono text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{customer.full_name}</p>
                        {customer.last_reading ? (
                          <Badge variant="default" className="text-[10px]">✓</Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{customer.sector}</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{customer.supply_number}</span>
                      </div>
                    </div>
                    <Link href={`/reader/new?supply=${customer.supply_number}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
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
