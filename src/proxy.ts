import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ROLE_COOKIE, encodeRoleCookie, decodeRoleCookie } from '@/lib/auth/constants'

const ROLE_COOKIE_MAX_AGE = 3600
const ROLE_CLIENT_COOKIE = 'x-user-role-client'

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
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value, c))
    response.cookies.delete(ROLE_COOKIE)
    response.cookies.delete(ROLE_CLIENT_COOKIE)
    return response
  }

  if (!userId && url.pathname === '/login') {
    supabaseResponse.cookies.delete(ROLE_COOKIE)
    supabaseResponse.cookies.delete(ROLE_CLIENT_COOKIE)
    return supabaseResponse
  }

  const getCachedRole = (): string | null => {
    if (!userId) return null
    return decodeRoleCookie(request.cookies.get(ROLE_COOKIE)?.value, userId)
  }

  const fetchAndCacheRole = async (): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_user_role')
    if (error) {
      console.error('[PROXY] get_user_role error:', JSON.stringify({ message: error.message, details: error.details, hint: error.hint, code: error.code }))
      return null
    }
    const role = data as string | null
    if (role && userId) {
      const encoded = encodeRoleCookie(userId, role)
      supabaseResponse.cookies.set(ROLE_COOKIE, encoded, {
        path: '/',
        maxAge: ROLE_COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
      })
      supabaseResponse.cookies.set(ROLE_CLIENT_COOKIE, encoded, {
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
  supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value, c))
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
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value, c))
    response.cookies.delete(ROLE_COOKIE)
    response.cookies.delete(ROLE_CLIENT_COOKIE)
    return response
  }

  if (url.pathname.startsWith('/admin') && role !== 'admin') {
    url.pathname = '/'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value, c))
    return response
  }

  if (url.pathname.startsWith('/cashier') && !['admin', 'cashier'].includes(role)) {
    url.pathname = '/'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value, c))
    return response
  }

  if (url.pathname.startsWith('/reader') && !['admin', 'meter_reader'].includes(role)) {
    url.pathname = '/'
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach(c => response.cookies.set(c.name, c.value, c))
    return response
  }
}

 return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sw.js|manifest\\.json).*)',
  ],
}
