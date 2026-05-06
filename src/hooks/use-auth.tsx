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

 const { data: { subscription } } = supabase.auth.onAuthStateChange(
 async (event, session) => {
 if (!mounted) return

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
 rpcAttemptedRef.current = false
 }
 }
 )

 const timeout = setTimeout(() => {
 if (mounted && !loadingDoneRef.current) {
 supabase.auth.getSession().then(({ data: { session } }) => {
 if (mounted && !loadingDoneRef.current) {
 if (!session) {
 setUser(null)
 setRole(null)
 loadingDoneRef.current = true
 setIsLoading(false)
 } else {
 const cookieRole = getRoleFromCookie()
 if (cookieRole) {
 setRole(cookieRole)
 loadingDoneRef.current = true
 setIsLoading(false)
 }
 }
 }
 })
 }
 }, 3000)

 return () => {
 mounted = false
 subscription.unsubscribe()
 clearTimeout(timeout)
 }
 }, [fetchRoleViaRPC, supabase.auth])

 const signOut = async () => {
 await supabase.auth.signOut()
 setUser(null)
 setRole(null)
 rpcAttemptedRef.current = false
 document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0`
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
