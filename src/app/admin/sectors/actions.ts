'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getSectorService } from '@/services/sector-service'
import { revalidatePath } from 'next/cache'

export async function createSectorAction(data: { name: string; code: string; description?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()
    const sectorService = getSectorService(supabase)

    await sectorService.createSector(data)
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al crear sector' }
  }
}

export async function updateSectorAction(id: string, data: { name?: string; code?: string; description?: string; is_active?: boolean }): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()
    const sectorService = getSectorService(supabase)

    await sectorService.updateSector(id, data)
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al actualizar sector' }
  }
}

export async function deleteSectorAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()
    const sectorService = getSectorService(supabase)

    await sectorService.deleteSector(id)
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al eliminar sector' }
  }
}

export async function assignReaderToSectorAction(readerId: string, sectorId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()
    const { error } = await supabase
      .from('profiles')
      .update({ assigned_sector_id: sectorId })
      .eq('id', readerId)
      .select()

    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al asignar lector' }
  }
}
