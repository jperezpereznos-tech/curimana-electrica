import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ROLE_COOKIE, decodeRoleCookie } from '@/lib/auth/constants'

export async function requireAdminAuth() {
  const supabase = await createClient()
	const { data: userData, error: userErr } = await supabase.auth.getUser()
	if (userErr || !userData?.user) {
    console.error('[ADMIN_AUTH] getUser error:', userErr?.message || 'sin usuario')
    throw new Error(`No autenticado: ${userErr?.message || 'sin usuario'}`)
  }

	const userId = userData.user.id
	const cookieStore = await cookies()
	const cachedRole = await decodeRoleCookie(cookieStore.get(ROLE_COOKIE)?.value, userId)

  if (cachedRole === 'admin') {
    return { supabase, userId, role: cachedRole }
  }

  console.log('[ADMIN_AUTH] Falling back to RPC get_user_role')
  const { data: role, error } = await supabase.rpc('get_user_role')
  if (error || !role) {
    console.error('[ADMIN_AUTH] RPC error or no role:', error)
    throw new Error('No se pudo verificar el rol del usuario')
  }
  if (role !== 'admin') {
    console.error('[ADMIN_AUTH] Role is not admin:', role)
    throw new Error('Acceso denegado: se requiere rol de administrador')
  }

  return { supabase, userId, role }
}
