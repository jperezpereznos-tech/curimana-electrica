'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const fetchRole = useCallback(async (retries = 3): Promise<string | null> => {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { data, error } = await supabase.rpc('get_user_role')

        if (error) {
          // If it's a lock error, retry after a delay
          const isLockError = error.message?.includes('Lock') || error.details?.includes('Lock')
          if (isLockError && attempt < retries - 1) {
            console.warn(`[useAuth] Lock contention on attempt ${attempt + 1}, retrying...`)
            await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
            continue
          }
          console.error('[useAuth] RPC get_user_role error:', error)
          setProfileError(`Error DB: ${error.message}`)
          return null
        }

        if (data) {
          setProfileError(null)
          return data as string
        }

        // RPC returned null - user may not have a profile yet
        setProfileError('No se encontró un perfil con rol asignado')
        return null
      } catch (e: any) {
        if (attempt < retries - 1) {
          console.warn(`[useAuth] Catch error on attempt ${attempt + 1}, retrying...`)
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
          continue
        }
        console.error('[useAuth] Catch error:', e)
        setProfileError(`Error: ${e.message}`)
        return null
      }
    }
    return null
  }, [supabase])

  useEffect(() => {
    let mounted = true

    // IMPORTANT: Only use onAuthStateChange to handle auth state.
    // DO NOT call getUser() separately - it causes a Web Locks deadlock
    // with onAuthStateChange because both try to acquire the same
    // "lock:sb-<project>-auth-token" lock simultaneously.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          const userRole = await fetchRole()
          if (mounted) {
            setRole(userRole)
            setIsLoading(false)
          }
        } else {
          setRole(null)
          setProfileError(null)
          setIsLoading(false)
        }
      }
    )

    // Safety net: if onAuthStateChange doesn't fire within 3 seconds
    // (e.g. no session exists), force loading to false
    const timeout = setTimeout(() => {
      if (mounted && isLoading) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (mounted && isLoading) {
            if (!session) {
              setUser(null)
              setRole(null)
              setIsLoading(false)
            }
            // If there IS a session, onAuthStateChange should handle it
          }
        })
      }
    }, 3000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRole, supabase.auth])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    router.push('/login')
  }

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
