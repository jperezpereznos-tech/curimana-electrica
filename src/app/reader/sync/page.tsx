'use client'

import { useState, useEffect } from 'react'
import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  RefreshCcw, 
  Cloud, 
  CloudOff, 
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
  
  const [syncProgress, setSyncProgress] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = async () => {
    if (!isOnline || isSyncing) return
    
    setIsSyncing(true)
    setSyncProgress(0)
    
    try {
      // Simular progreso
      const interval = setInterval(() => {
        setSyncProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval)
            return 90
          }
          return prev + 10
        })
      }, 300)
      
      await syncNow()
      
      clearInterval(interval)
      setSyncProgress(100)
      
      setTimeout(() => {
        setIsSyncing(false)
        setSyncProgress(0)
      }, 500)
    } catch (error) {
      setIsSyncing(false)
      setSyncProgress(0)
    }
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

        {/* Estado de Conexión */}
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

        {/* Resumen de Datos */}
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

        {/* Botón de Sincronización */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sincronizando...</span>
                  <span>{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} />
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

        {/* Estado de Sync */}
        {syncStatus && syncStatus !== 'idle' && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {syncStatus === 'error' ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : syncStatus === 'syncing' ? (
                  <RefreshCcw className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <p className="font-medium">
                    {syncStatus === 'error' ? 'Error de sincronización' : 
                     syncStatus === 'syncing' ? 'Sincronizando...' : 
                     'Sincronización completa'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ReaderLayout>
  )
}
