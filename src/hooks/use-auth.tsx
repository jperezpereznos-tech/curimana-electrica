'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type AuthContextType = {
  user: User | null
  role: string | null
  isLoading: boolean
  profileError: string | null
  signOut: () => Promise<void>
}

const ROLE_COOKIE = 'x-user-role'

const getRoleFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find(c => c.startsWith(`${ROLE_COOKIE}=`))
  return match ? decodeURIComponent(match.split('=')[1]) : null
}

const deleteRoleCookie = () => {
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`
  document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; domain=${window.location.hostname}`
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const loadingDoneRef = useRef(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const rpcAttemptedRef = useRef(false)
  const signingOutRef = useRef(false)

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

        if (data) {
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return

      const currentUser = session?.user ?? null
      setUser(currentUser)

      if (currentUser) {
        const cookieRole = getRoleFromCookie()
        if (cookieRole) {
          setRole(cookieRole)
          setProfileError(null)
          loadingDoneRef.current = true
          setIsLoading(false)

          if (!rpcAttemptedRef.current) {
            rpcAttemptedRef.current = true
            fetchRoleViaRPC().then(rpcRole => {
              if (mounted && rpcRole && rpcRole !== cookieRole) {
                setRole(rpcRole)
              }
            })
          }
        } else if (!rpcAttemptedRef.current) {
          rpcAttemptedRef.current = true
          fetchRoleViaRPC().then(userRole => {
            if (mounted) {
              setRole(userRole)
              loadingDoneRef.current = true
              setIsLoading(false)
            }
          })
        } else {
          loadingDoneRef.current = true
          setIsLoading(false)
        }
      } else {
        setRole(null)
        setProfileError(null)
        loadingDoneRef.current = true
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        if (signingOutRef.current && event !== 'SIGNED_OUT') return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const cookieRole = getRoleFromCookie()
          if (cookieRole && !rpcAttemptedRef.current) {
            setRole(cookieRole)
            setProfileError(null)
            loadingDoneRef.current = true
            setIsLoading(false)

            rpcAttemptedRef.current = true
            const rpcRole = await fetchRoleViaRPC()
            if (mounted && rpcRole && rpcRole !== cookieRole) {
              setRole(rpcRole)
            }
          } else if (!rpcAttemptedRef.current) {
            const userRole = await fetchRoleViaRPC()
            if (mounted) {
              setRole(userRole)
              loadingDoneRef.current = true
              setIsLoading(false)
            }
          } else {
            loadingDoneRef.current = true
            setIsLoading(false)
          }
        } else {
          setRole(null)
          setProfileError(null)
          loadingDoneRef.current = true
          setIsLoading(false)
        }

        if (event === 'SIGNED_OUT') {
          if (!signingOutRef.current) {
            rpcAttemptedRef.current = false
            setUser(null)
            setRole(null)
            deleteRoleCookie()
            router.replace('/login')
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchRoleViaRPC, router, supabase.auth])

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return
    signingOutRef.current = true

    setUser(null)
    setRole(null)
    setProfileError(null)
    rpcAttemptedRef.current = false
    deleteRoleCookie()

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

    router.replace('/login')
  }, [router, supabase.auth])

  return (
    <AuthContext.Provider value={{ user, role, isLoading, profileError, signOut }}>
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
