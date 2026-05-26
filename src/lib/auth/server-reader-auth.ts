import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ROLE_COOKIE, decodeRoleCookie } from '@/lib/auth/constants'

const VALID_READER_ROLES = new Set(['admin', 'meter_reader'])

export async function requireReaderAuth() {
  const supabase = await createClient()
	const { data: userData, error: userErr } = await supabase.auth.getUser()
	if (userErr || !userData?.user) throw new Error(`No autenticado: ${userErr?.message || 'sin usuario'}`)

	const userId = userData.user.id
	const cookieStore = await cookies()
	const cachedRole = await decodeRoleCookie(cookieStore.get(ROLE_COOKIE)?.value, userId)

  if (cachedRole && VALID_READER_ROLES.has(cachedRole)) {
    return { supabase, userId, role: cachedRole }
  }

  const { data: role, error } = await supabase.rpc('get_user_role')
  if (error || !role) throw new Error('No se pudo verificar el rol del usuario')
  if (role !== 'admin' && role !== 'meter_reader') throw new Error('Acceso denegado: se requiere rol de lecturador o administrador')

  return { supabase, userId, role }
}
