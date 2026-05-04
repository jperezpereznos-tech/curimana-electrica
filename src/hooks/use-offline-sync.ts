import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { readingService } from '@/services/reading-service'
import { periodService } from '@/services/period-service'
import { storageService } from '@/services/storage-service'
import { customerService } from '@/services/customer-service'
import { useAuth } from '@/hooks/use-auth'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

const MAX_RETRIES = 5

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const { user } = useAuth()
  const syncingRef = useRef(false)

  const updateCounter = useCallback(async () => {
    const pending = await db.pending_readings
      .where('status').anyOf(['pending', 'failed']).count()
    setPendingCount(pending)
  }, [])

  const syncCustomerCache = useCallback(async () => {
    if (!navigator.onLine) return
    try {
      const customers = await customerService.getAllForCache()
      if (customers && customers.length > 0) {
        await db.customers_cache.clear()
        await db.customers_cache.bulkPut(customers)
      }
    } catch (error) {
      console.error('Error syncing customer cache:', error)
    }
  }, [])

  const syncNow = useCallback(async (isManual = false) => {
    if (!isOnline || syncingRef.current) return

    syncingRef.current = true
    setSyncStatus('syncing')

    try {
      if (isManual) {
        const failedReadings = await db.pending_readings
          .where('status').equals('failed')
          .filter(r => (r.retry_count || 0) < MAX_RETRIES)
          .toArray()
        if (failedReadings.length > 0) {
          await db.pending_readings
            .where('id').anyOf(failedReadings.map(r => r.id!))
            .modify({ status: 'pending' })
        }
      }

      await syncCustomerCache()

      const pending = await db.pending_readings
        .where('status').equals('pending')
        .toArray()

      let periodId: string | null = null
      try {
        const currentPeriod = await periodService.getCurrentPeriod()
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
        return
      }

      let hasError = false

      for (const reading of pending) {
        try {
          await db.pending_readings.update(reading.id!, {
            status: 'syncing',
            last_attempt_time: Date.now()
          })

          let photoUrl: string | undefined = undefined
          if (reading.photo_base64) {
            try {
              const fileName = `reading_${reading.customer_id}_${Date.now()}.jpg`
              photoUrl = await storageService.uploadReadingPhoto(reading.photo_base64, fileName)
            } catch (photoError) {
              console.error('Error uploading photo:', photoError)
            }
          }

          await readingService.registerReading({
            customer_id: reading.customer_id,
            billing_period_id: periodId,
            previous_reading: reading.previous_reading,
            current_reading: reading.current_reading,
            reading_date: reading.reading_date,
            notes: reading.notes,
            photo_url: photoUrl
          }, user?.id)

          await db.pending_readings.delete(reading.id!)
        } catch (error) {
          console.error('Error syncing reading:', error)
          const retryCount = (reading.retry_count || 0) + 1
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
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus('error')
      setLastSyncTime(new Date().toISOString())
      await updateCounter()
    } finally {
      syncingRef.current = false
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }, [isOnline, updateCounter, syncCustomerCache, user?.id])

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

  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => { void syncNow(false) }, 30000)
      return () => clearInterval(interval)
    }
  }, [isOnline, syncNow])

  return {
    isOnline,
    pendingSyncCount: pendingCount,
    syncStatus,
    lastSyncTime,
    syncNow: () => syncNow(true)
  }
}
