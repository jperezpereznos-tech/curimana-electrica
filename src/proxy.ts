import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Actualizar sesión de Supabase (refresca tokens si es necesario)
  const response = await updateSession(request)

  const url = request.nextUrl.clone()

  // Para la protección por roles, necesitamos verificar la sesión
  // Extraer el user de la sesión desde las cookies
  const { createServerClient } = await import('@supabase/ssr')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Las cookies ya fueron seteadas por updateSession
        },
      },
    }
  )

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

  // 3. Proteccion por roles
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    if (!role && (url.pathname.startsWith('/admin') || url.pathname.startsWith('/cashier') || url.pathname.startsWith('/reader'))) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/admin') && role !== 'admin') {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/cashier') && !['admin', 'cashier'].includes(role || '')) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/reader') && !['admin', 'meter_reader'].includes(role || '')) {
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public assets)
     * - sw.js (service worker)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sw.js).*)',
  ],
}
