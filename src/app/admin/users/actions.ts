'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getProfileService } from '@/services/profile-service'
import { getSectorService } from '@/services/sector-service'
import { revalidatePath } from 'next/cache'

export async function getUsersWithRolesAction() {
  const { supabase } = await requireAdminAuth()
  const profileService = getProfileService(supabase)
  const sectorService = getSectorService(supabase)

  const [users, sectors] = await Promise.all([
    profileService.getAllUsers(),
    sectorService.getActiveSectors()
  ])

  return { users, sectors }
}

export async function updateUserRoleAction(userId: string, role: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()
    const profileService = getProfileService(supabase)
    await profileService.updateRole(userId, role)
    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al cambiar rol' }
  }
}

export async function assignSectorToUserAction(userId: string, sectorId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()
    const profileService = getProfileService(supabase)
    await profileService.assignSector(userId, sectorId)
    revalidatePath('/admin/users')
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al asignar sector' }
  }
}

export async function inviteUserAction(
  email: string,
  fullName: string,
  role: string,
  sectorId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()
    const profileService = getProfileService(supabase)

    const authResult = await profileService.inviteUser(email, '', fullName)
    if (!authResult.user) {
      return { success: false, error: 'No se pudo crear el usuario' }
    }

    const userId = authResult.user.id

    if (role !== 'meter_reader') {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await profileService.updateRole(userId, role)
          break
        } catch {
          if (attempt === 4) {
            return { success: false, error: 'Usuario creado pero no se pudo asignar el rol. Asignelo manualmente.' }
          }
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        }
      }
    }

    if (sectorId) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await profileService.assignSector(userId, sectorId)
          break
        } catch {
          if (attempt === 4) {
            return { success: false, error: 'Usuario creado pero no se pudo asignar el sector. Asignelo manualmente.' }
          }
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        }
      }
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al invitar usuario' }
  }
}

export async function deleteUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await requireAdminAuth()

    const { data: currentUser } = await supabase.auth.getClaims()
    if (currentUser && currentUser.claims.sub === userId) {
      return { success: false, error: 'No puedes eliminar tu propia cuenta' }
    }

    const profileService = getProfileService(supabase)
    await profileService.deleteUser(userId)

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al eliminar usuario' }
  }
}
