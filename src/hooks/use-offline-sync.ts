import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/lib/db/dexie'
import { getPeriodService } from '@/services/period-service'
import { getCustomerService } from '@/services/customer-service'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { registerReadingAction } from '@/app/reader/actions'
import { toast } from 'sonner'

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

const MAX_RETRIES = 5
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
  const [exhaustedCount, setExhaustedCount] = useState(0)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)
  const { user } = useAuth()
  const syncingRef = useRef(false)
  const assignedSectorIdRef = useRef<string | null>(null)

  const updateCounter = useCallback(async () => {
    const pending = await db.pending_readings
      .where('status').anyOf(['pending', 'failed']).count()
    setPendingCount(pending)
    const exhausted = await db.pending_readings
      .where('status').equals('failed')
      .filter(r => (r.retry_count || 0) >= MAX_RETRIES)
      .count()
    setExhaustedCount(exhausted)
  }, [])

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const syncCustomerCache = useCallback(async () => {
    if (!navigator.onLine || !user?.id) return
    try {
      const supabase = createClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('assigned_sector_id')
        .eq('id', user.id)
        .maybeSingle()

      const sectorId = profile?.assigned_sector_id || null
      assignedSectorIdRef.current = sectorId

      const freshCustomerService = getCustomerService(supabase)
      const customers = await withTimeout(
        freshCustomerService.getAllForCache(sectorId || undefined),
        CACHE_SYNC_TIMEOUT_MS
      )
    if (customers && customers.length > 0) {
      const stamped = customers.map(c => ({ ...c, last_updated: Date.now() }))
      await db.transaction('rw', db.customers_cache, async () => {
        await db.customers_cache.clear()
        await db.customers_cache.bulkPut(stamped)
      })
    }
  } catch (error) {
    console.error('Error syncing customer cache — offline search may use stale data:', error)
  }
  }, [user?.id])

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

  const syncNow = useCallback(async () => {
    if (!isOnline || syncingRef.current) return

    syncingRef.current = true
    setSyncStatus('syncing')

    try {
      const sessionOk = await refreshSession()
      if (!sessionOk) {
        setSyncStatus('error')
        setLastSyncTime(new Date().toISOString())
        await updateCounter()
        toast.error('Error de sincronización: sesión expirada. Inicia sesión de nuevo.')
        return
      }

      const stuckSyncing = await db.pending_readings
        .where('status').equals('syncing')
        .toArray()
      if (stuckSyncing.length > 0) {
        await db.pending_readings
          .where('id').anyOf(stuckSyncing.map(r => r.id!))
          .modify({ status: 'pending' })
      }

      const failedReadings = await db.pending_readings
        .where('status').equals('failed')
        .toArray()
      if (failedReadings.length > 0) {
        await db.pending_readings
          .where('id').anyOf(failedReadings.map(r => r.id!))
          .modify({ status: 'pending', retry_count: 0 })
      }

      await syncCustomerCache()

      const pending = await db.pending_readings
        .where('status').equals('pending')
        .toArray()

      let periodId: string | null = null
      try {
        const freshSupabase = createClient()
        const freshPeriodService = getPeriodService(freshSupabase)
        const currentPeriod = await withTimeout(
          freshPeriodService.getCurrentPeriod(),
          PERIOD_FETCH_TIMEOUT_MS
        )
        if (currentPeriod) {
          periodId = currentPeriod.id
        }
      } catch (error: unknown) {
        console.error('Error getting current period:', error instanceof Error ? error.message : String(error))
      }

      if (!periodId) {
        const errMsg = 'No hay un periodo de facturación abierto. Contacta al administrador para abrir el periodo actual.'
        console.error('Sync aborted: no open billing period found. Readings will stay pending until a period is opened.')
        setSyncStatus('error')
        setLastSyncTime(new Date().toISOString())
        await updateCounter()
        toast.error(errMsg)
        return
      }

      let hasError = false

      for (const reading of pending) {
        try {
          if (assignedSectorIdRef.current && reading.sector_id && reading.sector_id !== assignedSectorIdRef.current) {
            console.error(`Skipping reading for customer outside assigned sector (supply: ${reading.supply_number}, sector: ${reading.sector_id}, assigned: ${assignedSectorIdRef.current})`)
            await db.pending_readings.update(reading.id!, {
              status: 'failed',
              retry_count: MAX_RETRIES,
              last_attempt_time: Date.now()
            })
            hasError = true
            continue
          }

          await db.pending_readings.update(reading.id!, {
            status: 'syncing',
            last_attempt_time: Date.now()
          })

          const previousReading = Number(reading.previous_reading) || 0
          const currentReading = Number(reading.current_reading) || 0

          const actionResult = await withTimeout(
            registerReadingAction({
              customer_id: reading.customer_id,
              billing_period_id: periodId!,
              previous_reading: previousReading,
              current_reading: currentReading,
              reading_date: reading.reading_date,
              notes: reading.notes,
            }),
            READING_INSERT_TIMEOUT_MS
          )

          if (!actionResult.success) {
            if (actionResult.error === 'DUPLICATE_READING') {
              await db.pending_readings.delete(reading.id!)
              continue
            }
            throw new Error(actionResult.error || 'Error al registrar lectura en servidor')
          }

          await db.pending_readings.delete(reading.id!)
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : String(error)
          const errObj = error instanceof Error ? error as Error & { code?: string } : null
          const hint = errObj?.code === '23503' ? 'FK constraint: customer_id or billing_period_id not found'
            : errObj?.code === '42501' ? 'RLS policy denied: session may be expired'
            : errObj?.code === '23505' ? 'Duplicate reading already exists'
            : ''
          console.error(`Error syncing reading (customer: ${reading.customer_id}, supply: ${reading.supply_number}):`, errMsg, hint ? `| ${hint}` : '')
          const retryCount = (reading.retry_count || 0) + 1
          await db.pending_readings.update(reading.id!, {
            status: 'failed',
            retry_count: retryCount,
            last_attempt_time: Date.now()
          })
          hasError = true
          toast.error(`Error en suministro ${reading.supply_number}: ${errMsg}`)
        }
      }

      setSyncStatus(hasError ? 'error' : 'success')
      setLastSyncTime(new Date().toISOString())
      await updateCounter()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Sync failed:', error)
      setSyncStatus('error')
      setLastSyncTime(new Date().toISOString())
      await updateCounter()
      toast.error(`Error de sincronización: ${errMsg}`)
    } finally {
      syncingRef.current = false
      setTimeout(() => setSyncStatus('idle'), 10000)
    }
  }, [isOnline, updateCounter, syncCustomerCache, refreshSession])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void syncCustomerCache()
      void updateCounter()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const timer = window.setTimeout(() => {
      void updateCounter()
      if (navigator.onLine) void syncCustomerCache()
    }, 0)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateCounter, syncCustomerCache])

  return {
    isOnline,
    pendingSyncCount: pendingCount,
    exhaustedSyncCount: exhaustedCount,
    syncStatus,
    lastSyncTime,
    syncNow
  }
}
