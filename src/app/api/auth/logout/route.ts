import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { ROLE_COOKIE, ROLE_CLIENT_COOKIE } from '@/lib/auth/constants'

export async function POST() {
  const supabase = await createClient()

  await supabase.auth.signOut()

  const response = NextResponse.json({ success: true })
  response.cookies.delete(ROLE_COOKIE)
  response.cookies.delete(ROLE_CLIENT_COOKIE)
  return response
}
