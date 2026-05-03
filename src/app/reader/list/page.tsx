import { createClient } from '@/lib/supabase/server'
import { ReadingRouteClient } from './reading-route-client'

export default async function ReadingRoutePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let assignedSector = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('assigned_sector_id, sectors:sectors!profiles_assigned_sector_id_fkey(id, name, code)')
      .eq('id', user.id)
      .single()

    if (profile?.assigned_sector_id) {
      assignedSector = (profile as any).sectors
    }
  }

  return <ReadingRouteClient assignedSector={assignedSector} />
}
