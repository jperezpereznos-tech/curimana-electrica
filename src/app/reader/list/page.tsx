import { createClient } from '@/lib/supabase/server'
import { ReadingRouteClient } from './reading-route-client'
import type { AssignedSectorItem } from '@/types/views'

export default async function ReadingRoutePage() {
  const supabase = await createClient()
 const { data: claimsData } = await supabase.auth.getClaims()

 let assignedSector: AssignedSectorItem | null = null
 if (claimsData) {
 const { data: profile } = await supabase
 .from('profiles')
 .select('assigned_sector_id, sectors:sectors!profiles_assigned_sector_id_fkey(id, name, code)')
 .eq('id', claimsData.claims.sub)
      .single()

    if (profile?.assigned_sector_id) {
      assignedSector = (profile as { sectors: AssignedSectorItem }).sectors
    }
  }

  return <ReadingRouteClient assignedSector={assignedSector} />
}
