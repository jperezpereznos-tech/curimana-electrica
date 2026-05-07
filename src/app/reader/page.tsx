'use client'

import { useState, useEffect } from 'react'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, RefreshCcw, Camera, Search, List, MapPin, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db/dexie'
import { getReaderDashboardDataAction } from './actions'
import { toast } from 'sonner'

export default function ReaderDashboard() {
  const { isOnline, pendingSyncCount, syncNow } = useOfflineSync()
  const [hasMounted, setHasMounted] = useState(false)
  const [todayCount, setTodayCount] = useState(0)
  const [syncedCount, setSyncedCount] = useState(0)
  const [activeCustomers, setActiveCustomers] = useState(0)
  const [periodInfo, setPeriodInfo] = useState<{ name: string; endDate: string } | null>(null)
  const [sectorName, setSectorName] = useState<string | null>(null)
  const [dashboardError, setDashboardError] = useState<string | null>(null)

  useEffect(() => {
    setHasMounted(true)
    let cancelled = false

    const today = new Date().toISOString().split('T')[0]

    db.pending_readings
      .where('reading_date')
      .startsWith(today)
      .count()
      .then(count => { if (!cancelled) setTodayCount(count) })

    if (navigator.onLine) {
      getReaderDashboardDataAction()
        .then(data => {
          if (!cancelled) {
            setSyncedCount(data.syncedCount)
            setActiveCustomers(data.activeCustomers)
            setPeriodInfo(data.period)
            setSectorName(data.sectorName)
            setDashboardError(null)
          }
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setDashboardError(e instanceof Error ? e.message : 'Error al cargar datos del dashboard')
          }
        })
    }

    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {dashboardError && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {dashboardError}
        </div>
      )}

  {sectorName ? (
  <div className="p-3 rounded-lg bg-muni-blue/10 text-muni-blue flex items-center gap-2 font-medium">
    <MapPin className="h-5 w-5" />
    Sector: {sectorName}
  </div>
) : hasMounted ? (
  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-center">
    <MapPin className="h-8 w-8 mx-auto mb-2" />
    <p className="font-bold text-lg">Sin sector asignado</p>
    <p className="text-sm mt-1">Contacte al administrador para que le asigne un sector antes de continuar.</p>
  </div>
) : null}
{!hasMounted ? (
  <div className="h-12 w-full animate-pulse bg-muted rounded-lg" />
) : (
  <div className={`p-3 rounded-lg flex items-center justify-between ${isOnline ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
    <div className="flex items-center gap-2 font-medium">
      {isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
      {isOnline ? 'En línea' : 'Sin conexión'}
    </div>
    {pendingSyncCount > 0 && isOnline && (
      <Button size="sm" onClick={syncNow} variant="ghost" className="gap-2 h-8">
        <RefreshCcw className="h-4 w-4" /> Sincronizar ({pendingSyncCount})
      </Button>
    )}
    {pendingSyncCount > 0 && !isOnline && (
      <Badge variant="destructive">{pendingSyncCount} pendientes</Badge>
    )}
  </div>
)}

<div className="grid grid-cols-2 gap-4">
  <Card>
    <CardHeader className="p-4 pb-0">
      <CardTitle className="text-xs uppercase text-muted-foreground">Lecturas Hoy</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-2">
      <div className="text-2xl font-bold">{todayCount} / {activeCustomers}</div>
    </CardContent>
  </Card>
  <Card>
    <CardHeader className="p-4 pb-0">
      <CardTitle className="text-xs uppercase text-muted-foreground">Sincronizadas</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-2">
      <div className="text-2xl font-bold text-success">{syncedCount}</div>
    </CardContent>
  </Card>
</div>

{hasMounted && !sectorName ? null : (
  <div className="flex flex-col gap-3 mt-4">
    <Button size="lg" className="h-20 text-lg gap-3" nativeButton={false} render={<Link href="/reader/new"><Camera className="h-6 w-6" /> Nueva Lectura</Link>} />
    <Button variant="outline" size="lg" className="h-16 gap-3" nativeButton={false} render={<Link href="/reader/search"><Search className="h-5 w-5" /> Buscar Suministro</Link>} />
    <Button variant="outline" size="lg" className="h-16 gap-3" nativeButton={false} render={<Link href="/reader/list"><List className="h-5 w-5" /> Ruta de Lectura</Link>} />
  </div>
)}

{periodInfo && (
        <Card className="mt-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-center">
            <p className="font-semibold text-primary">Periodo: {periodInfo.name}</p>
            <p className="text-muted-foreground text-xs">Cierre: {periodInfo.endDate}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}