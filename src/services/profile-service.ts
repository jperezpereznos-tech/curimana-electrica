import { ProfileRepository } from '@/repositories/profile-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/admin'

export class ProfileService {
  private profileRepo: ProfileRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.profileRepo = new ProfileRepository(supabaseClient)
  }

  async getAllUsers() {
    return await this.profileRepo.getAllWithSector()
  }

  async getReaders() {
    return await this.profileRepo.getReaders()
  }

  async updateRole(userId: string, role: string) {
    return await this.profileRepo.updateRole(userId, role)
  }

  async assignSector(userId: string, sectorId: string | null) {
    return await this.profileRepo.updateAssignedSector(userId, sectorId)
  }

  async inviteUser(email: string, _password: string, fullName: string) {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
    })

    if (error) throw error

    return { user: data.user ? { id: data.user.id, email: data.user.email } : null }
  }
}

export const profileService = new ProfileService()

export function getProfileService(supabaseClient: SupabaseClient<Database>) {
  return new ProfileService(supabaseClient)
}
