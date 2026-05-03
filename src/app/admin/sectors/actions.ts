'use server'

import { createClient } from '@/lib/supabase/server'
import { getSectorService } from '@/services/sector-service'
import { revalidatePath } from 'next/cache'

export async function createSectorAction(data: { name: string; code: string; description?: string }) {
  const supabase = await createClient()
  const sectorService = getSectorService(supabase)

  const result = await sectorService.createSector(data)
  revalidatePath('/admin/sectors')
  return result
}

export async function updateSectorAction(id: string, data: { name?: string; code?: string; description?: string; is_active?: boolean }) {
  const supabase = await createClient()
  const sectorService = getSectorService(supabase)

  const result = await sectorService.updateSector(id, data)
  revalidatePath('/admin/sectors')
  return result
}

export async function deleteSectorAction(id: string) {
  const supabase = await createClient()
  const sectorService = getSectorService(supabase)

  const result = await sectorService.deleteSector(id)
  revalidatePath('/admin/sectors')
  return result
}

export async function assignReaderToSectorAction(readerId: string, sectorId: string | null) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({ assigned_sector_id: sectorId })
    .eq('id', readerId)
    .select()

  if (error) throw new Error(error.message)
  revalidatePath('/admin/sectors')
  return data
}
