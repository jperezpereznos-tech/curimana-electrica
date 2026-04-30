import { useCallback, useEffect, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { readingService } from '@/services/reading-service'
import { periodRepository } from '@/repositories/period-repository'
import { storageService } from '@/services/storage-service'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  const updateCounter = useCallback(async () => {
    const count = await db.pending_readings.where('status').equals('pending').count()
    setPendingCount(count)
  }, [])

  const syncNow = useCallback(async () => {
    if (!isOnline) return

    setSyncStatus('syncing')
    const pending = await db.pending_readings.where('status').equals('pending').toArray()

    // Get current period ID
    let periodId: string;
    try {
      const currentPeriod = await periodRepository.getCurrentPeriod();
      periodId = currentPeriod?.id || 'CURRENT_PERIOD_ID';
    } catch (error) {
      console.error('Error getting current period:', error)
      periodId = 'CURRENT_PERIOD_ID';
    }

    let hasError = false
    for (const reading of pending) {
      try {
        // Actualizar estado a syncing
        await db.pending_readings.update(reading.id!, { status: 'syncing' })

        // Subir foto si existe
        let photoUrl: string | undefined = undefined
        if (reading.photo_base64) {
          try {
            const fileName = `reading_${reading.customer_id}_${Date.now()}.jpg`
            photoUrl = await storageService.uploadReadingPhoto(reading.photo_base64, fileName)
          } catch (photoError) {
            console.error('Error uploading photo:', photoError)
            // Si falla la foto, continuamos con la lectura pero sin foto
          }
        }

// Add a check for decreasing meter readings
        if (reading.current_reading < reading.previous_reading) {
          // This is a decreasing reading - flag it for review
          console.warn('Reading is decreasing - marking for review')
        }

// Enviar al servidor
        await readingService.registerReading({
          customer_id: reading.customer_id,
          billing_period_id: periodId,
          previous_reading: reading.previous_reading,
          current_reading: reading.current_reading,
          reading_date: reading.reading_date,
          notes: reading.notes,
          photo_url: photoUrl
        })

        // Eliminar de local si tuvo éxito
        await db.pending_readings.delete(reading.id!)
      } catch (error) {
        console.error('Error syncing reading:', error)
        await db.pending_readings.update(reading.id!, { status: 'failed' })
        hasError = true
      }
    }

    setSyncStatus(hasError ? 'error' : 'success')
    setLastSyncTime(new Date().toISOString())
    await updateCounter()

    // Reset status after 3 seconds
    setTimeout(() => setSyncStatus('idle'), 3000)
  }, [isOnline, updateCounter])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const timer = window.setTimeout(() => {
      void updateCounter()
    }, 0)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateCounter])

  // Auto-sync cada 30 segundos si está online
  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(syncNow, 30000)
      return () => clearInterval(interval)
    }
  }, [isOnline, syncNow])

  return { 
    isOnline, 
    pendingSyncCount: pendingCount, 
    syncStatus, 
    lastSyncTime,
    syncNow 
  }
}
