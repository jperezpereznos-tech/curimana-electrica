import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export class ProfileRepository extends BaseRepository<'profiles'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('profiles', supabaseClient)
  }

  async getAllWithSector(): Promise<(Profile & { sectors: { id: string; name: string; code: string } | null })[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*, sectors:sectors!profiles_assigned_sector_id_fkey(id, name, code)')
      .order('full_name', { ascending: true })

    if (error) throw error
    return data as any
  }

  async getReaders(): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('role', 'meter_reader')
      .order('full_name', { ascending: true })

    if (error) throw error
    return data
  }

  async updateRole(userId: string, role: string): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateAssignedSector(userId: string, sectorId: string | null): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ assigned_sector_id: sectorId })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}
