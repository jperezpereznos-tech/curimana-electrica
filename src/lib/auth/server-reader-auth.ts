import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { ROLE_COOKIE } from '@/lib/auth/constants'

const VALID_READER_ROLES = new Set(['admin', 'meter_reader'])

export async function requireReaderAuth() {
  const supabase = await createClient()
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
  if (claimsErr || !claimsData) throw new Error(`No autenticado: ${claimsErr?.message || 'sin claims'}`)

  const cookieStore = await cookies()
  const cachedRole = cookieStore.get(ROLE_COOKIE)?.value

  if (cachedRole && VALID_READER_ROLES.has(cachedRole)) {
    return { supabase, userId: claimsData.claims.sub, role: cachedRole }
  }

  const { data: role, error } = await supabase.rpc('get_user_role')
  if (error || !role) throw new Error('No se pudo verificar el rol del usuario')
  if (role !== 'admin' && role !== 'meter_reader') throw new Error('Acceso denegado: se requiere rol de lecturador o administrador')

  return { supabase, userId: claimsData.claims.sub, role }
}
