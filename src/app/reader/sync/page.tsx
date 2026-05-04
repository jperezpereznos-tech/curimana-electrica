'use client'

import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Database,
  Upload,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useOfflineSync } from '@/hooks/use-offline-sync'

export default function SyncPage() {
  const {
    isOnline,
    pendingSyncCount,
    syncStatus,
    lastSyncTime,
    syncNow
  } = useOfflineSync()

  const isSyncing = syncStatus === 'syncing'

  const handleSync = () => {
    if (!isOnline || isSyncing || pendingSyncCount === 0) return
    void syncNow()
  }

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Nunca'
    const date = new Date(lastSyncTime)
    return date.toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ReaderLayout>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-bold">Sincronización</h2>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-full ${isOnline ? 'bg-green-100' : 'bg-amber-100'}`}>
                  {isOnline ? (
                    <Wifi className="h-6 w-6 text-green-600" />
                  ) : (
                    <WifiOff className="h-6 w-6 text-amber-600" />
                  )}
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
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Database className="h-5 w-5 text-blue-600" />
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
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{formatLastSync()}</p>
                  <p className="text-xs text-muted-foreground">Última sync</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {isSyncing && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <RefreshCcw className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Sincronizando lecturas...</span>
              </div>
            )}

            <Button
              className="w-full h-14 text-lg gap-3"
              onClick={handleSync}
              disabled={!isOnline || isSyncing || pendingSyncCount === 0}
            >
              {isSyncing ? (
                <RefreshCcw className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              {isSyncing ? 'Sincronizando...' : pendingSyncCount === 0 ? 'Sin datos pendientes' : `Sincronizar ${pendingSyncCount} lecturas`}
            </Button>

            {!isOnline && (
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  No hay conexión a internet. Las lecturas se sincronizarán automáticamente cuando recuperes la conexión.
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
          </CardContent>
        </Card>

        {syncStatus === 'error' && (
          <Card className="border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Error de sincronización</p>
                  <p className="text-sm text-muted-foreground">
                    Algunas lecturas no se pudieron sincronizar. Se reintentarán automáticamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {syncStatus === 'success' && (
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-700">Sincronización completa</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ReaderLayout>
  )
}
