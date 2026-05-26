'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getSectorService } from '@/services/sector-service'
import { revalidatePath } from 'next/cache'
import { uuidSchema, sectorCreateSchema, sectorUpdateSchema } from '@/lib/validations/schemas'

export async function createSectorAction(data: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = sectorCreateSchema.parse(data)
    const { supabase } = await requireAdminAuth()
    const sectorService = getSectorService(supabase)

    await sectorService.createSector(parsed)
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al crear sector' }
  }
}

export async function updateSectorAction(id: string, data: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    uuidSchema.parse(id)
    const parsed = sectorUpdateSchema.parse(data)
    const { supabase } = await requireAdminAuth()
    const sectorService = getSectorService(supabase)

    await sectorService.updateSector(id, parsed)
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al actualizar sector' }
  }
}

export async function deleteSectorAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    uuidSchema.parse(id)
    const { supabase } = await requireAdminAuth()
    const sectorService = getSectorService(supabase)

    await sectorService.deleteSector(id)
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar sector' }
  }
}

export async function assignReaderToSectorAction(readerId: string, sectorId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    uuidSchema.parse(readerId)
    if (sectorId !== null) uuidSchema.parse(sectorId)
    const { supabase } = await requireAdminAuth()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', readerId)
      .single()

    if (profileError || !profile) {
      return { success: false, error: 'Usuario no encontrado' }
    }
    if (profile.role !== 'meter_reader' && sectorId !== null) {
      return { success: false, error: 'Solo se puede asignar sector a un lecturador' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ assigned_sector_id: sectorId })
      .eq('id', readerId)
      .select()

    if (error) return { success: false, error: 'Error al asignar sector' }
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al asignar lector' }
  }
}
