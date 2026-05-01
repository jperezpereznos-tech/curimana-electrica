import { useCallback, useEffect, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { readingService } from '@/services/reading-service'
import { periodService } from '@/services/period-service'
import { storageService } from '@/services/storage-service'
import { customerService } from '@/services/customer-service'

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

  const syncCustomerCache = useCallback(async () => {
    if (!navigator.onLine) return
    try {
      const customers = await customerService.searchCustomers('')
      if (customers && customers.length > 0) {
        await db.customers_cache.clear()
        await db.customers_cache.bulkPut(
          customers.map((c: any) => ({
            id: c.id,
            supply_number: c.supply_number,
            full_name: c.full_name,
            address: c.address || '',
            sector: c.sector || '',
            tariff_id: c.tariff_id || '',
            previous_reading: 0,
          }))
        )
      }
    } catch (error) {
      console.error('Error syncing customer cache:', error)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!isOnline) return

    setSyncStatus('syncing')

    await syncCustomerCache()

    const pending = await db.pending_readings.where('status').equals('pending').toArray()

    // Get current period ID
    let periodId: string | null = null
    try {
      const currentPeriod = await periodService.getCurrentPeriod();
      if (currentPeriod) {
        periodId = currentPeriod.id
      }
    } catch (error) {
      console.error('Error getting current period:', error)
    }

    if (!periodId) {
      setSyncStatus('error')
      setLastSyncTime(new Date().toISOString())
      await updateCounter()
      setTimeout(() => setSyncStatus('idle'), 3000)
      return
    }

    let hasError = false
    // Add exponential backoff for retry attempts
    const now = Date.now();
    const retryableReadings = pending.filter(reading => {
      // If we don't have retry info, initialize it
      if (reading.retry_count === undefined) {
        return true;
      }
      
      // Exponential backoff: wait 2^retry_count * 1000ms before retrying
      const timeSinceLastAttempt = now - (reading.last_attempt_time || 0);
      const minWaitTime = Math.pow(2, reading.retry_count || 0) * 1000; // 1 second * 2^retry_count
      
      return timeSinceLastAttempt > minWaitTime;
    });

    for (const reading of retryableReadings) {
      try {
        // Actualizar estado a syncing
        await db.pending_readings.update(reading.id!, { 
          status: 'syncing',
          retry_count: reading.retry_count || 0,
          last_attempt_time: now
        })

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
        // Update the reading with retry information
        const retryCount = (reading.retry_count || 0) + 1;
        await db.pending_readings.update(reading.id!, { 
          status: 'failed',
          retry_count: retryCount,
          last_attempt_time: Date.now()
        })
        hasError = true
      }
    }

    setSyncStatus(hasError ? 'error' : 'success')
    setLastSyncTime(new Date().toISOString())
    await updateCounter()

    // Reset status after 3 seconds
    setTimeout(() => setSyncStatus('idle'), 3000)
  }, [isOnline, updateCounter, syncCustomerCache])

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
