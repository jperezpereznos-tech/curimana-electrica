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

export async function updateUserRoleAction(userId: string, role: string) {
  const { supabase } = await requireAdminAuth()
  const profileService = getProfileService(supabase)

  const result = await profileService.updateRole(userId, role)
  revalidatePath('/admin/users')
  return result
}

export async function assignSectorToUserAction(userId: string, sectorId: string | null) {
  const { supabase } = await requireAdminAuth()
  const profileService = getProfileService(supabase)

  const result = await profileService.assignSector(userId, sectorId)
  revalidatePath('/admin/users')
  revalidatePath('/admin/sectors')
  return result
}

export async function inviteUserAction(email: string, fullName: string, role: string) {
  const { supabase } = await requireAdminAuth()
  const profileService = getProfileService(supabase)

  const authResult = await profileService.inviteUser(email, '', fullName)

  if (authResult.user && role !== 'meter_reader') {
    await profileService.updateRole(authResult.user.id, role)
  }

  revalidatePath('/admin/users')
  return authResult
}

export async function deleteUserAction(userId: string) {
  const { supabase } = await requireAdminAuth()

  const { data: currentUser } = await supabase.auth.getClaims()
  if (currentUser && currentUser.claims.sub === userId) {
    throw new Error('No puedes eliminar tu propia cuenta')
  }

  const profileService = getProfileService(supabase)
  await profileService.deleteUser(userId)

  revalidatePath('/admin/users')
}
