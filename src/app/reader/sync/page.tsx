'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
 RefreshCcw, CheckCircle2, AlertTriangle, Database, Upload, Wifi, WifiOff
} from 'lucide-react'
import { useOfflineSync } from '@/hooks/use-offline-sync'

export default function SyncPage() {
  const {
    isOnline, pendingSyncCount, exhaustedSyncCount, syncStatus, lastSyncTime, syncNow
  } = useOfflineSync()

 const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true)
  }, [])

 const isSyncing = syncStatus === 'syncing'

 const handleSync = () => {
 if (!isOnline || isSyncing || pendingSyncCount === 0) return
 void syncNow()
 }

 const formatLastSync = () => {
 if (!lastSyncTime) return 'Nunca'
 const date = new Date(lastSyncTime)
 return date.toLocaleString('es-PE', {
 day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
 }).replace(/\u202f/g, ' ')
 }

 return (
 <div className="flex flex-col gap-4">
 <h2 className="text-xl font-bold">Sincronización</h2>

 <Card>
 <CardContent className="p-4">
 {!hasMounted ? (
 <div className="h-16 w-full animate-pulse bg-muted rounded-lg" />
 ) : (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${isOnline ? 'bg-muni-green/10' : 'bg-muni-amber/10'}`}>
            {isOnline ? <Wifi className="h-6 w-6 text-muni-green" /> : <WifiOff className="h-6 w-6 text-muni-amber" />}
 </div>
 <div>
 <p className="font-medium">{isOnline ? 'Conectado' : 'Sin conexión'}</p>
 <p className="text-sm text-muted-foreground">
 {isOnline ? 'Sincronización disponible' : 'Trabajando en modo offline'}
 </p>
 </div>
 </div>
 <Badge variant={isOnline ? 'default' : 'secondary'}>
 {isOnline ? 'Online' : 'Offline'}
 </Badge>
 </div>
 )}
 </CardContent>
 </Card>

 {!hasMounted ? (
 <div className="grid grid-cols-2 gap-3">
 <div className="h-20 animate-pulse bg-muted rounded-lg" />
 <div className="h-20 animate-pulse bg-muted rounded-lg" />
 </div>
 ) : (
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-muni-blue/10 rounded-full">
              <Database className="h-5 w-5 text-muni-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSyncCount}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-muni-green/10 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-muni-green" />
              </div>
              <div>
                <p className="text-sm font-medium">{formatLastSync()}</p>
                <p className="text-xs text-muted-foreground">Última sync</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {hasMounted && exhaustedSyncCount > 0 && (
      <Card className="border-muni-amber/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muni-amber/10 rounded-full">
              <AlertTriangle className="h-5 w-5 text-muni-amber" />
            </div>
            <div>
              <p className="font-medium text-muni-amber">{exhaustedSyncCount} lecturas sin reintentos</p>
                <p className="text-xs text-muted-foreground">
                  Alcanzaron el máximo de intentos. Reinténtalas manualmente desde Lecturas Pendientes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

 <Card>
 <CardContent className="p-4 space-y-4">
 {!hasMounted ? (
 <div className="h-14 w-full animate-pulse bg-muted rounded-lg" />
 ) : (
 <>
 {isSyncing && (
          <div className="flex items-center gap-3 p-3 bg-muni-blue-light rounded-lg">
            <RefreshCcw className="h-5 w-5 animate-spin text-muni-blue" />
            <span className="text-sm font-medium text-muni-blue">Sincronizando lecturas...</span>
 </div>
 )}

 <Button
 className="w-full h-14 text-lg gap-3"
 onClick={handleSync}
 disabled={!isOnline || isSyncing || pendingSyncCount === 0}
 >
 {isSyncing ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
 {isSyncing ? 'Sincronizando...' : pendingSyncCount === 0 ? 'Sin datos pendientes' : `Sincronizar ${pendingSyncCount} lecturas`}
 </Button>

 {!isOnline && (
 <Alert variant="destructive">
 <WifiOff className="h-4 w-4" />
 <AlertDescription>
          No hay conexión a internet. Presiona el botón de sincronización cuando recuperes la conexión.
 </AlertDescription>
 </Alert>
 )}

 {isOnline && pendingSyncCount === 0 && (
 <Alert>
 <CheckCircle2 className="h-4 w-4" />
 <AlertDescription>
 Todas las lecturas están sincronizadas.
 </AlertDescription>
 </Alert>
 )}
 </>
 )}
 </CardContent>
 </Card>

 {hasMounted && syncStatus === 'error' && (
 <Card className="border-destructive">
 <CardContent className="p-4">
 <div className="flex items-center gap-3">
 <AlertTriangle className="h-5 w-5 text-destructive" />
 <div>
 <p className="font-medium text-destructive">Error de sincronización</p>
 <p className="text-sm text-muted-foreground">
          Algunas lecturas no se pudieron sincronizar. Reinténtalas manualmente.
 </p>
 </div>
 </div>
 </CardContent>
 </Card>
 )}

 {hasMounted && syncStatus === 'success' && (
      <Card className="border-muni-green/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-muni-green" />
            <p className="font-medium text-muni-green">Sincronización completa</p>
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 )
}
