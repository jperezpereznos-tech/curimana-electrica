import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()

  let supabaseResponse = NextResponse.next({ request })

  // Crear un solo cliente Supabase con manejo correcto de cookies
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

  // Refrescar sesión y obtener usuario
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Si no hay usuario y no está en /login, redirigir a /login
  if (!user && url.pathname !== '/login') {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Helper: obtener rol del usuario usando SECURITY DEFINER function
  const getUserRole = async (): Promise<string | null> => {
    const { data, error } = await supabase.rpc('get_user_role')
    if (error) {
      console.error('PROXY get_user_role error:', error)
      return null
    }
    return data as string | null
  }

  // 2. Si hay usuario y está en /login o en la raíz /, redirigir al dashboard según rol
  if (user && (url.pathname === '/login' || url.pathname === '/')) {
    const role = await getUserRole()

    if (role === 'admin') {
      url.pathname = '/admin'
    } else if (role === 'cashier') {
      url.pathname = '/cashier'
    } else if (role === 'meter_reader') {
      url.pathname = '/reader'
    } else {
      // Sin rol válido, dejar en / para que el frontend muestre el error
      if (url.pathname === '/login') {
        url.pathname = '/'
      } else {
        return supabaseResponse
      }
    }
    return NextResponse.redirect(url)
  }

  // 3. Protección por roles - solo para rutas protegidas
  const isProtectedRoute = url.pathname.startsWith('/admin') || 
                           url.pathname.startsWith('/cashier') || 
                           url.pathname.startsWith('/reader')

  if (user && isProtectedRoute) {
    const role = await getUserRole()

    // Si hubo error al consultar el perfil, dejar pasar a la página raíz para que el frontend maneje el error
    if (!role) {
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
   * - public (public assets)
   * - sw.js (service worker)
   * - manifest.json (PWA manifest)
   */
  '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|sw.js|manifest\\.json).*)',
  ],
}
