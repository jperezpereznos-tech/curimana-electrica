import { createClient } from '@/lib/supabase/server'
import { getCustomerService } from '@/services/customer-service'
import { ReadingRouteClient } from './reading-route-client'
import { StaggerReveal } from '@/components/stagger-reveal'
import type { AssignedSectorItem } from '@/types/views'

interface RouteCustomer {
  id: string
  supply_number: string
  full_name: string
  address: string | null
  sectorName: string | null
  sector_id: string | null
  is_active: boolean | null
  last_reading: string | null
}

export default async function ReadingRoutePage() {
  const supabase = await createClient()
	const { data: userData } = await supabase.auth.getUser()

	let assignedSector: AssignedSectorItem | null = null
	let customers: RouteCustomer[] = []

	if (userData?.user) {
		const { data: profile } = await supabase
			.from('profiles')
			.select('assigned_sector_id, sectors:sectors!profiles_assigned_sector_id_fkey(id, name, code)')
			.eq('id', userData.user.id)
      .single()

    if (profile?.assigned_sector_id) {
      assignedSector = (profile as { sectors: AssignedSectorItem }).sectors
    }

    if (assignedSector) {
      try {
        const customerService = getCustomerService(supabase)
        const data = await customerService.getActiveCustomersWithReadings(assignedSector.id)
        customers = (data || []).map((c) => ({
          id: c.id,
          supply_number: c.supply_number,
          full_name: c.full_name,
          address: c.address,
          sectorName: c.sectors?.name || 'Sin Sector',
          sector_id: c.sector_id || c.sectors?.id || null,
          is_active: c.is_active,
          last_reading: c.readings && c.readings.length > 0
            ? c.readings[c.readings.length - 1].reading_date
            : null
        }))
      } catch (e) {
        console.error('Error loading reading route:', e)
      }
    }
  }

  return <StaggerReveal><ReadingRouteClient assignedSector={assignedSector} customers={customers} /></StaggerReveal>
}
