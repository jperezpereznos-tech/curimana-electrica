import { ProfileRepository } from '@/repositories/profile-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

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

  async inviteUser(email: string, password: string, fullName: string) {
    const supabase = this.profileRepo['supabase']
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) throw error
    return data
  }
}

export const profileService = new ProfileService()

export function getProfileService(supabaseClient: SupabaseClient<Database>) {
  return new ProfileService(supabaseClient)
}
