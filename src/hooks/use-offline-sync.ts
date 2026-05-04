import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { readingService } from '@/services/reading-service'
import { periodService } from '@/services/period-service'
import { storageService } from '@/services/storage-service'
import { customerService } from '@/services/customer-service'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

const MAX_RETRIES = 5
const PHOTO_UPLOAD_TIMEOUT_MS = 20_000
const READING_INSERT_TIMEOUT_MS = 15_000
const CACHE_SYNC_TIMEOUT_MS = 10_000
const PERIOD_FETCH_TIMEOUT_MS = 10_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    promise.then(
      val => { clearTimeout(timer); resolve(val) },
      err => { clearTimeout(timer); reject(err) }
    )
  })
}

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
      const customers = await withTimeout(
        customerService.getAllForCache(),
        CACHE_SYNC_TIMEOUT_MS
      )
      if (customers && customers.length > 0) {
        await db.customers_cache.clear()
        await db.customers_cache.bulkPut(customers)
      }
    } catch (error) {
      console.error('Error syncing customer cache:', error)
    }
  }, [])

  const refreshSession = useCallback(async () => {
    try {
      return await withTimeout((async () => {
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) {
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('Session refresh failed:', refreshError)
            return false
          }
        }
        return true
      })(), 8000)
    } catch (error) {
      console.error('Session refresh timed out or failed:', error)
      return false
    }
  }, [])

  const syncNow = useCallback(async (isManual = false) => {
    if (!isOnline || syncingRef.current) return

    syncingRef.current = true
    setSyncStatus('syncing')

    try {
      const sessionOk = await refreshSession()
      if (!sessionOk) {
        setSyncStatus('error')
        setLastSyncTime(new Date().toISOString())
        await updateCounter()
        return
      }

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
        const currentPeriod = await withTimeout(
          periodService.getCurrentPeriod(),
          PERIOD_FETCH_TIMEOUT_MS
        )
        if (currentPeriod) {
          periodId = currentPeriod.id
        }
      } catch (error: any) {
        console.error('Error getting current period:', error?.message || error)
      }

      if (!periodId) {
        console.error('Sync aborted: no open billing period found. Readings will stay pending until a period is opened.')
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

        const previousReading = Number(reading.previous_reading) || 0
        const currentReading = Number(reading.current_reading) || 0
        const currentUserId = user?.id

        await withTimeout(
          (async () => {
            let photoUrl: string | undefined = undefined
            if (reading.photo_base64) {
              try {
                const fileName = `reading_${reading.customer_id}_${Date.now()}.jpg`
                photoUrl = await withTimeout(
                  storageService.uploadReadingPhoto(reading.photo_base64, fileName),
                  PHOTO_UPLOAD_TIMEOUT_MS
                )
              } catch (photoError) {
                console.error('Error uploading photo:', photoError)
              }
            }

            await withTimeout(
              readingService.registerReading({
                customer_id: reading.customer_id,
                billing_period_id: periodId!,
                previous_reading: previousReading,
                current_reading: currentReading,
                reading_date: reading.reading_date,
                notes: reading.notes,
                photo_url: photoUrl
              }, currentUserId),
              READING_INSERT_TIMEOUT_MS
            )
          })(),
          PHOTO_UPLOAD_TIMEOUT_MS + READING_INSERT_TIMEOUT_MS
        )

          await db.pending_readings.delete(reading.id!)
    } catch (error: any) {
      const errMsg = error?.message || error?.code || String(error)
      const hint = error?.code === '23503' ? 'FK constraint: customer_id or billing_period_id not found'
        : error?.code === '42501' ? 'RLS policy denied: session may be expired'
        : error?.code === '23505' ? 'Duplicate reading already exists'
        : ''
      console.error(`Error syncing reading (customer: ${reading.customer_id}, supply: ${reading.supply_number}):`, errMsg, hint ? `| ${hint}` : '')
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
  }, [isOnline, updateCounter, syncCustomerCache, refreshSession, user?.id])

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
