'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getProfileService } from '@/services/profile-service'
import { getSectorService } from '@/services/sector-service'
import { revalidatePath } from 'next/cache'
import { uuidSchema, roleSchema, inviteUserSchema } from '@/lib/validations/schemas'

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
    uuidSchema.parse(userId)
    roleSchema.parse(role)
    const { supabase, userId: currentUserId } = await requireAdminAuth()

    if (userId === currentUserId) {
      return { success: false, error: 'No puedes cambiar tu propio rol' }
    }

    const profileService = getProfileService(supabase)
    const allProfiles = await profileService.getAllUsers()
    const adminCount = allProfiles.filter((p: { role: string | null }) => p.role === 'admin').length
    const targetProfile = allProfiles.find((p: { id: string }) => p.id === userId)

    if (targetProfile?.role === 'admin' && role !== 'admin' && adminCount <= 1) {
      return { success: false, error: 'No se puede cambiar el rol del último administrador' }
    }

    await profileService.updateRole(userId, role)
    revalidatePath('/admin/users')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al cambiar rol' }
  }
}

export async function assignSectorToUserAction(userId: string, sectorId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    uuidSchema.parse(userId)
    if (sectorId !== null) uuidSchema.parse(sectorId)
    const { supabase } = await requireAdminAuth()
    const profileService = getProfileService(supabase)
    await profileService.assignSector(userId, sectorId)
    revalidatePath('/admin/users')
    revalidatePath('/admin/sectors')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al asignar sector' }
  }
}

export async function inviteUserAction(
  email: string,
  fullName: string,
  role: string,
  sectorId?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = inviteUserSchema.parse({ email, fullName, role, sectorId })
    const { supabase } = await requireAdminAuth()
    const profileService = getProfileService(supabase)

    const authResult = await profileService.inviteUser(parsed.email, '', parsed.fullName)
    if (!authResult.user) {
      return { success: false, error: 'No se pudo crear el usuario' }
    }

    const userId = authResult.user.id

    if (parsed.role !== 'meter_reader') {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await profileService.updateRole(userId, parsed.role)
          break
        } catch {
          if (attempt === 4) {
            return { success: false, error: 'Usuario creado pero no se pudo asignar el rol. Asignelo manualmente.' }
          }
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        }
      }
    }

    if (parsed.sectorId) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await profileService.assignSector(userId, parsed.sectorId)
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
  } catch {
    return { success: false, error: 'Error al invitar usuario' }
  }
}

export async function deleteUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    uuidSchema.parse(userId)
    const { supabase } = await requireAdminAuth()

	const { data: currentUser } = await supabase.auth.getUser()
	if (currentUser?.user && currentUser.user.id === userId) {
      return { success: false, error: 'No puedes eliminar tu propia cuenta' }
    }

    const profileService = getProfileService(supabase)
    await profileService.deleteUser(userId)

    revalidatePath('/admin/users')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al eliminar usuario' }
  }
}
