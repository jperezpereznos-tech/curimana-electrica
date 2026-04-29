'use client'

import { ReaderLayout } from '@/components/layouts/reader-layout'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, RefreshCcw, Camera, Search, List } from 'lucide-react'
import Link from 'next/link'

export default function ReaderDashboard() {
  const { isOnline, pendingSyncCount, syncNow } = useOfflineSync()

  return (
    <ReaderLayout>
      <div className="flex flex-col gap-4">
        {/* Estado de Conexión */}
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

        {/* Resumen de Trabajo */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xs uppercase text-muted-foreground">Lecturas Hoy</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="text-2xl font-bold">12 / 45</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-0">
              <CardTitle className="text-xs uppercase text-muted-foreground">Sincronizadas</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="text-2xl font-bold text-success">10</div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Principales */}
        <div className="flex flex-col gap-3 mt-4">
        <Button size="lg" className="h-20 text-lg gap-3" render={<Link href="/reader/new"><Camera className="h-6 w-6" /> Nueva Lectura</Link>} />

        <Button variant="outline" size="lg" className="h-16 gap-3" render={<Link href="/reader/search"><Search className="h-5 w-5" /> Buscar Suministro</Link>} />

        <Button variant="outline" size="lg" className="h-16 gap-3" render={<Link href="/reader/list"><List className="h-5 w-5" /> Ruta de Lectura</Link>} />
        </div>

        {/* Aviso Periodo */}
        <Card className="mt-4 border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm text-center">
            <p className="font-semibold text-primary">Periodo: JUNIO 2025</p>
            <p className="text-muted-foreground text-xs">Cierre: 25 de Junio</p>
          </CardContent>
        </Card>
      </div>
    </ReaderLayout>
  )
}
