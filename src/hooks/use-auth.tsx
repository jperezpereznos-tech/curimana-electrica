'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'
import { ROLE_CLIENT_COOKIE, decodeRoleCookieClient } from '@/lib/auth/constants'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { db } from '@/lib/db/dexie'
import { toast } from 'sonner'

type AuthContextType = {
  user: User | null
  role: string | null
  isLoading: boolean
  profileError: string | null
  signOut: () => Promise<void>
  syncAndSignOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function getRoleFromCookie(expectedUserId: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${ROLE_CLIENT_COOKIE}=([^;]*)`))
  if (!match) return null
  const raw = decodeURIComponent(match[1])
  return decodeRoleCookieClient(raw, expectedUserId)
}

function deleteRoleCookie() {
  if (typeof document === 'undefined') return
  document.cookie = `${ROLE_CLIENT_COOKIE}=; path=/; max-age=0; sameSite=lax`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const loadingDoneRef = useRef(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const rpcAttemptedRef = useRef(false)
  const signingOutRef = useRef(false)
  const isOnline = useOnlineStatus()
  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

  const fetchRoleViaRPC = useCallback(async (retries = 3): Promise<string | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase.rpc('get_user_role')

        if (error) {
          const isLockError = error.message?.includes('Lock') || error.details?.includes('Lock')
          if (isLockError && attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
            continue
          }
          console.error('[useAuth] RPC get_user_role error:', JSON.stringify({
            message: error.message, details: error.details, hint: error.hint, code: error.code
          }))
          setProfileError(`Error DB: ${error.message || error.hint || 'Error desconocido'}`)
          return null
        }

          if (data != null) {
            setProfileError(null)
            return data as string
          }

        setProfileError('No se encontró un perfil con rol asignado')
        return null
      } catch (e: unknown) {
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
          continue
        }
        console.error('[useAuth] Catch error:', e)
        setProfileError(`Error: ${e instanceof Error ? e.message : String(e)}`)
        return null
      }
    }
    return null
  }, [supabase])

  useEffect(() => {
    let mounted = true

    const safetyTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('[useAuth] Safety timeout triggered. Forcing isLoading to false.')
        setIsLoading(false)
      }
    }, 5000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const cookieRole = getRoleFromCookie(currentUser.id)
        if (cookieRole) {
          setRole(cookieRole)
          loadingDoneRef.current = true
          setIsLoading(false)
          clearTimeout(safetyTimeout)
          if (!rpcAttemptedRef.current) {
            rpcAttemptedRef.current = true
            fetchRoleViaRPC().then(rpcRole => {
              if (mounted && rpcRole && rpcRole !== cookieRole) setRole(rpcRole)
            })
          }
        } else if (!rpcAttemptedRef.current) {
          rpcAttemptedRef.current = true
          fetchRoleViaRPC().then(userRole => {
            if (mounted) {
              setRole(userRole)
              loadingDoneRef.current = true
              setIsLoading(false)
              clearTimeout(safetyTimeout)
            }
          })
        } else {
          loadingDoneRef.current = true
          setIsLoading(false)
          clearTimeout(safetyTimeout)
        }
      } else {
        setRole(null)
        setProfileError(null)
        loadingDoneRef.current = true
        setIsLoading(false)
        clearTimeout(safetyTimeout)
      }
    }).catch(err => {
      console.error('[useAuth] getSession error:', err)
      if (mounted) {
        setIsLoading(false)
        clearTimeout(safetyTimeout)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (signingOutRef.current && event !== 'SIGNED_OUT') return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const cookieRole = getRoleFromCookie(currentUser.id)
          if (cookieRole) {
            setRole(cookieRole)
            loadingDoneRef.current = true
            setIsLoading(false)
            clearTimeout(safetyTimeout)
            if (!rpcAttemptedRef.current) {
              rpcAttemptedRef.current = true
              fetchRoleViaRPC().then(rpcRole => {
                if (mounted && rpcRole && rpcRole !== cookieRole) setRole(rpcRole)
              })
            }
          } else if (!rpcAttemptedRef.current) {
            rpcAttemptedRef.current = true
            const userRole = await fetchRoleViaRPC()
            if (mounted) {
              setRole(userRole)
              loadingDoneRef.current = true
              setIsLoading(false)
              clearTimeout(safetyTimeout)
            }
          } else {
            loadingDoneRef.current = true
            setIsLoading(false)
            clearTimeout(safetyTimeout)
          }
        } else {
          setRole(null)
          setProfileError(null)
          loadingDoneRef.current = true
          setIsLoading(false)
          clearTimeout(safetyTimeout)
        }

        if (event === 'SIGNED_OUT') {
          rpcAttemptedRef.current = false
          setUser(null)
          setRole(null)
          signingOutRef.current = false
          deleteRoleCookie()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchRoleViaRPC, supabase.auth])

  const performSignOut = useCallback(async () => {
    signingOutRef.current = true
    deleteRoleCookie()
    setUser(null)
    setRole(null)
    setProfileError(null)
    rpcAttemptedRef.current = false

    try {
      await supabase.auth.signOut({ scope: 'global' })
    } catch (e) {
      console.error('[useAuth] signOut error:', e)
    }

    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Server-side cookie cleanup — best effort
    }

    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      try {
        await indexedDB.deleteDatabase('CurimanaDB')
      } catch {
        // IndexedDB cleanup — best effort
      }
    }

    signingOutRef.current = false
    window.location.href = '/login'
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return

    if (typeof window !== 'undefined') {
      try {
        const pendingCount = await db.pending_readings
          .where('status')
          .anyOf(['pending', 'failed'])
          .count()

        if (pendingCount > 0) {
          const confirmed = window.confirm(
            `Tienes ${pendingCount} lectura(s) pendiente(s) de sincronizar. Si cierras sesión se perderán.\n\nPresiona "Cancelar" para volver e intentar sincronizar, o "Aceptar" para cerrar sesión de todas formas.`
          )
          if (!confirmed) return
        }
      } catch {
        // Dexie unavailable — proceed with logout
      }
    }

    await performSignOut()
  }, [performSignOut])

  const syncAndSignOut = useCallback(async () => {
    if (signingOutRef.current) return

    if (typeof window !== 'undefined') {
      try {
        const pendingCount = await db.pending_readings
          .where('status')
          .anyOf(['pending', 'failed'])
          .count()

        if (pendingCount > 0 && isOnlineRef.current) {
          toast.info(`Sincronizando ${pendingCount} lectura(s) antes de cerrar sesión...`)
          const supa = createClient()
          const { data: sessionData } = await supa.auth.getSession()
          if (!sessionData.session) {
            toast.error('Sesión expirada. No se pudieron sincronizar las lecturas.')
            signingOutRef.current = false
            return
          }

          const { registerReadingAction } = await import('@/app/reader/actions')
          const { getPeriodService } = await import('@/services/period-service')
          const periodService = getPeriodService(supa)
          const currentPeriod = await periodService.getCurrentPeriod()

          if (!currentPeriod || currentPeriod.is_closed) {
            toast.error('No hay periodo abierto. No se pudieron sincronizar las lecturas.')
            signingOutRef.current = false
            return
          }

          const pending = await db.pending_readings
            .where('status')
            .anyOf(['pending', 'failed'])
            .toArray()

          let synced = 0
          let failed = 0
          for (const reading of pending) {
            try {
              const result = await registerReadingAction({
                customer_id: reading.customer_id,
                billing_period_id: currentPeriod.id,
                previous_reading: reading.previous_reading,
                current_reading: reading.current_reading,
                reading_date: reading.reading_date,
                notes: reading.notes,
              })
              if (result.success) {
                await db.pending_readings.delete(reading.id!)
                synced++
              } else if (result.error !== 'DUPLICATE_READING') {
                failed++
              } else {
                await db.pending_readings.delete(reading.id!)
              }
            } catch {
              failed++
            }
          }

          if (synced > 0) toast.success(`${synced} lectura(s) sincronizada(s).`)
          if (failed > 0) toast.error(`${failed} lectura(s) no pudieron sincronizarse.`)
        }
      } catch (e) {
        console.error('[useAuth] sync before signOut failed:', e)
        toast.error('Error al sincronizar. Intenta cerrar sesión de todas formas.')
      }
    }

    await performSignOut()
  }, [performSignOut])

  return (
    <AuthContext.Provider value={{ user, role, isLoading, profileError, signOut, syncAndSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
