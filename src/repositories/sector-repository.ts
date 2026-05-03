import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Sector = Database['public']['Tables']['sectors']['Row']

export class SectorRepository extends BaseRepository<'sectors'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('sectors', supabaseClient)
  }

  async getActiveSectors(): Promise<Sector[]> {
    const { data, error } = await this.supabase
      .from('sectors')
      .select('*')
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) throw error
    return data
  }

  async getSectorWithReaders(sectorId: string) {
    const { data, error } = await this.supabase
      .from('sectors')
      .select('*, profiles:profiles!profiles_assigned_sector_id_fkey(id, full_name, email)')
      .eq('id', sectorId)
      .single()

    if (error) throw error
    return data
  }

  async getCustomerCount(sectorId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('sector_id', sectorId)

    if (error) throw error
    return count ?? 0
  }
}
