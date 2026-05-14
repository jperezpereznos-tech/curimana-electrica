import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ROLE_COOKIE } from '@/lib/auth/constants'

const ROLE_COOKIE_MAX_AGE = 3600

const LOGIN_RATE_LIMIT = 5
const LOGIN_RATE_WINDOW_MS = 60_000
const loginAttempts = new Map<string, { count: number; windowStart: number }>()

function isLoginRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = loginAttempts.get(ip)

  if (!entry || now - entry.windowStart > LOGIN_RATE_WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, windowStart: now })
    return false
  }

  entry.count++
  if (entry.count > LOGIN_RATE_LIMIT) {
    return true
  }
  return false
}

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}

export async function proxy(request: NextRequest) {
 const url = request.nextUrl.clone()

 let supabaseResponse = NextResponse.next({ request })

 const supabase = createServerClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
 {
 cookies: {
 getAll() {
 return request.cookies.getAll()
 },
 setAll(cookiesToSet, headers) {
 cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
 supabaseResponse = NextResponse.next({ request })
 cookiesToSet.forEach(({ name, value, options }) =>
 supabaseResponse.cookies.set(name, value, options)
 )
 Object.entries(headers).forEach(([key, value]) =>
 supabaseResponse.headers.set(key, value)
 )
 },
 },
 }
 )

 const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
 if (claimsError) console.error('[PROXY] getClaims error:', claimsError.message)
 const userId = claimsData ? claimsData.claims.sub : null

  if (!userId && url.pathname !== '/login') {
    url.pathname = '/login'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
    response.cookies.delete(ROLE_COOKIE)
    return response
  }

  if (!userId && url.pathname === '/login') {
    if (request.method === 'POST' && isLoginRateLimited(getClientIp(request))) {
      return new NextResponse('Demasiados intentos. Espere un momento.', { status: 429 })
    }
    supabaseResponse.cookies.delete(ROLE_COOKIE)
    return supabaseResponse
  }

 const getCachedRole = (): string | null => {
 return request.cookies.get(ROLE_COOKIE)?.value ?? null
 }

 const fetchAndCacheRole = async (): Promise<string | null> => {
 const { data, error } = await supabase.rpc('get_user_role')
 if (error) {
 console.error('[PROXY] get_user_role error:', JSON.stringify({ message: error.message, details: error.details, hint: error.hint, code: error.code }))
 return null
 }
 const role = data as string | null
 if (role) {
    supabaseResponse.cookies.set(ROLE_COOKIE, role, {
      path: '/',
      maxAge: ROLE_COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: 'lax',
    })
 }
 return role
 }

 const getRole = async (): Promise<string | null> => {
 const cached = getCachedRole()
 if (cached) return cached
 return fetchAndCacheRole()
 }

 if (userId && (url.pathname === '/login' || url.pathname === '/')) {
 const role = await getRole()

 if (role === 'admin') {
 url.pathname = '/admin'
 } else if (role === 'cashier') {
 url.pathname = '/cashier'
 } else if (role === 'meter_reader') {
 url.pathname = '/reader'
 } else {
 if (url.pathname === '/login') {
 url.pathname = '/'
 } else {
 return supabaseResponse
 }
 }
 const response = NextResponse.redirect(url)
 supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
 return response
 }

 const isProtectedRoute = url.pathname.startsWith('/admin') ||
 url.pathname.startsWith('/cashier') ||
 url.pathname.startsWith('/reader')

 if (userId && isProtectedRoute) {
 const role = await getRole()

 if (!role) {
 url.pathname = '/'
 const response = NextResponse.redirect(url)
 supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
 response.cookies.delete(ROLE_COOKIE)
 return response
 }

 if (url.pathname.startsWith('/admin') && role !== 'admin') {
 url.pathname = '/'
 const response = NextResponse.redirect(url)
 supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
 return response
 }

 if (url.pathname.startsWith('/cashier') && !['admin', 'cashier'].includes(role)) {
 url.pathname = '/'
 const response = NextResponse.redirect(url)
 supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
 return response
 }

 if (url.pathname.startsWith('/reader') && !['admin', 'meter_reader'].includes(role)) {
 url.pathname = '/'
 const response = NextResponse.redirect(url)
 supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value))
 return response
 }
 }

 return supabaseResponse
}

export const config = {
 matcher: [
 '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sw.js|manifest\\.json).*)',
 ],
}
