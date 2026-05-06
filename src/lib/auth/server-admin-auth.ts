import { createClient } from '@/lib/supabase/server'

export async function requireAdminAuth() {
  const supabase = await createClient()
 const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
 if (claimsErr || !claimsData) throw new Error(`No autenticado: ${claimsErr?.message || 'sin claims'}`)

 const { data: role, error } = await supabase.rpc('get_user_role')
 if (error || !role) throw new Error('No se pudo verificar el rol del usuario')
 if (role !== 'admin') throw new Error('Acceso denegado: se requiere rol de administrador')

 return { supabase, userId: claimsData.claims.sub, role }
}
