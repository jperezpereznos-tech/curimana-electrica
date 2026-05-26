import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { patchGetClaims } from './patch'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) return client

  client = patchGetClaims(
    createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  )
  return client
}
