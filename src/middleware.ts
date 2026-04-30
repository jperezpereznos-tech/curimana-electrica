import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()

  let supabaseResponse = NextResponse.next({ request })

  // Crear cliente Supabase con manejo correcto de cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: Refrescar sesión - esto renueva tokens expirados
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Si no hay usuario y no está en /login, redirigir a /login
  if (!user && url.pathname !== '/login') {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Si hay usuario y está en /login, redirigir al home
  if (user && url.pathname === '/login') {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // 3. Protección por roles - solo para rutas protegidas
  const isProtectedRoute = url.pathname.startsWith('/admin') || 
                           url.pathname.startsWith('/cashier') || 
                           url.pathname.startsWith('/reader')

  if (user && isProtectedRoute) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Si hubo error o no hay rol, redirigir a / para que el frontend maneje
    if (profileError || !role) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/admin') && role !== 'admin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/cashier') && !['admin', 'cashier'].includes(role)) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/reader') && !['admin', 'meter_reader'].includes(role)) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, sw.js, manifest.json)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sw.js|manifest.json).*)',
  ],
}
