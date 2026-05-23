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
const AUTO_SYNC_BASE_MS = 30_000
const AUTO_SYNC_MAX_MS = 300_000
const BACKOFF_MULTIPLIER = 2

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
  const consecutiveErrorsRef = useRef(0)
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncNowRef = useRef<() => Promise<number>>(() => Promise.resolve(0))

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

  const refreshSession = useCallback(async (): Promise<{ ok: boolean, message?: string }> => {
    try {
      return await withTimeout((async () => {
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session) {
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error('Session refresh failed:', refreshError)
            return { ok: false, message: 'La sesión ha expirado o es inválida. Inicia sesión de nuevo.' }
          }
        }
        return { ok: true }
      })(), 15000)
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Session refresh timed out or failed:', errMsg)
      if (errMsg.includes('timed out')) {
        return { ok: false, message: 'Tiempo de espera agotado al verificar la sesión. Revisa tu conexión.' }
      }
      return { ok: false, message: `Error al verificar sesión: ${errMsg}` }
    }
  }, [])

  const getAutoSyncDelay = useCallback((consecutiveErrors: number) => {
    if (consecutiveErrors === 0) return AUTO_SYNC_BASE_MS
    const delay = Math.min(AUTO_SYNC_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, consecutiveErrors - 1), AUTO_SYNC_MAX_MS)
    return delay
  }, [])

  const scheduleAutoSync = useCallback((hadErrors: boolean = false) => {
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current)
      autoSyncTimerRef.current = null
    }
    if (hadErrors) {
      consecutiveErrorsRef.current = Math.min(consecutiveErrorsRef.current + 1, 10)
    } else {
      consecutiveErrorsRef.current = 0
    }
    const delay = getAutoSyncDelay(consecutiveErrorsRef.current)
    autoSyncTimerRef.current = setTimeout(() => {
      if (navigator.onLine) void syncNowRef.current()
    }, delay)
  }, [getAutoSyncDelay])

  const syncNow = useCallback(async () => {
    if (!isOnline || syncingRef.current) return 0

    syncingRef.current = true
    setSyncStatus('syncing')

    let syncHadErrors = false

    try {
      const sessionStatus = await refreshSession()
      if (!sessionStatus.ok) {
        setSyncStatus('error')
        setLastSyncTime(new Date().toISOString())
        await updateCounter()
        toast.error(`Error de sincronización: ${sessionStatus.message}`)
        return 1
      }

      const [stuckSyncing, failedReadings] = await Promise.all([
        db.pending_readings.where('status').equals('syncing').toArray(),
        db.pending_readings.where('status').equals('failed').toArray(),
      ])
      if (stuckSyncing.length > 0) {
        await db.pending_readings
          .where('id').anyOf(stuckSyncing.map(r => r.id!))
          .modify({ status: 'pending' })
      }
      if (failedReadings.length > 0) {
        await db.pending_readings
          .where('id').anyOf(failedReadings.map(r => r.id!))
          .modify({ status: 'pending', retry_count: 0 })
      }

      const [, currentPeriod] = await Promise.all([
        syncCustomerCache(),
        (async () => {
          try {
            const freshSupabase = createClient()
            const freshPeriodService = getPeriodService(freshSupabase)
            return await withTimeout(
              freshPeriodService.getCurrentPeriod(),
              PERIOD_FETCH_TIMEOUT_MS
            )
          } catch (error: unknown) {
            console.error('Error getting current period:', error instanceof Error ? error.message : String(error))
            return null
          }
        })(),
      ])
      const periodId = currentPeriod?.id ?? null

      if (!periodId) {
        console.error('Sync aborted: no open billing period found. Readings will stay pending until a period is opened.')
        setSyncStatus('error')
        setLastSyncTime(new Date().toISOString())
        await updateCounter()
        toast.error('No hay un periodo de facturación abierto. Contacta al administrador para abrir el periodo actual.')
        return 1
      }

      const pending = await db.pending_readings
        .where('status').equals('pending')
        .toArray()

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
              toast.info(`Lectura de ${reading.supply_number} ya existe en el servidor. Se eliminó la copia local.`)
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

      syncHadErrors = hasError
      setSyncStatus(hasError ? 'error' : 'success')
      setLastSyncTime(new Date().toISOString())
      await updateCounter()
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('Sync failed:', error)
      syncHadErrors = true
      setSyncStatus('error')
      setLastSyncTime(new Date().toISOString())
      await updateCounter()
      toast.error(`Error de sincronización: ${errMsg}`)
    } finally {
      syncingRef.current = false
      setTimeout(() => setSyncStatus('idle'), 10000)
      scheduleAutoSync(syncHadErrors)
    }
    return syncHadErrors ? 1 : 0
  }, [isOnline, updateCounter, syncCustomerCache, refreshSession, scheduleAutoSync])

  useEffect(() => {
    syncNowRef.current = syncNow
  }, [syncNow])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      consecutiveErrorsRef.current = 0
      void syncCustomerCache()
      void updateCounter()
      void syncNow()
    }
    const handleOffline = () => {
      setIsOnline(false)
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current)
        autoSyncTimerRef.current = null
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const timer = window.setTimeout(() => {
      void updateCounter()
      if (navigator.onLine) {
        void syncCustomerCache()
        void syncNow()
      }
    }, 0)

    return () => {
      window.clearTimeout(timer)
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current)
        autoSyncTimerRef.current = null
      }
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateCounter, syncCustomerCache, syncNow, scheduleAutoSync])

  return {
    isOnline,
    pendingSyncCount: pendingCount,
    exhaustedSyncCount: exhaustedCount,
    syncStatus,
    lastSyncTime,
    syncNow,
    syncCustomerCache,
    scheduleAutoSync,
  }
}
