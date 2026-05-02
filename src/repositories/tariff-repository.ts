import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Tariff = Database['public']['Tables']['tariffs']['Row']
type TariffTier = Database['public']['Tables']['tariff_tiers']['Row']

export type TariffWithTiers = Tariff & {
  tariff_tiers: TariffTier[]
}

export class TariffRepository extends BaseRepository<'tariffs'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('tariffs', supabaseClient)
  }

  async getAllWithTiers(): Promise<TariffWithTiers[]> {
    const { data, error } = await this.supabase
      .from('tariffs')
      .select('*, tariff_tiers(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as TariffWithTiers[]
  }

  async getByIdWithTiers(id: string): Promise<TariffWithTiers> {
    const { data, error } = await this.supabase
      .from('tariffs')
      .select('*, tariff_tiers(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as TariffWithTiers
  }

  async createTariffWithTiers(
    tariff: Omit<Database['public']['Tables']['tariffs']['Insert'], 'id' | 'created_at'>,
    tiers: Omit<Database['public']['Tables']['tariff_tiers']['Insert'], 'id' | 'created_at' | 'tariff_id'>[]
  ) {
    const { data: newTariff, error: tariffError } = await this.supabase
      .from('tariffs')
      .insert(tariff)
      .select()
      .single()

    if (tariffError) throw tariffError

    if (tiers.length > 0) {
      const tiersToInsert = tiers.map(t => ({ ...t, tariff_id: newTariff.id }))
      const { error: tiersError } = await this.supabase
        .from('tariff_tiers')
        .insert(tiersToInsert)

      if (tiersError) {
        await this.delete(newTariff.id)
        throw tiersError
      }
    }

    return newTariff
  }

  async updateTariffWithTiers(
    id: string,
    tariff: Partial<Omit<Database['public']['Tables']['tariffs']['Update'], 'id' | 'created_at'>>,
    tiers: Omit<Database['public']['Tables']['tariff_tiers']['Insert'], 'id' | 'created_at' | 'tariff_id'>[]
  ) {
    const { data: updatedTariff, error: tariffError } = await this.supabase
      .from('tariffs')
      .update(tariff)
      .eq('id', id)
      .select()
      .single()

    if (tariffError) throw tariffError
    if (!updatedTariff) throw new Error(`Tariff update failed — no rows matched id ${id}`)

    const { error: deleteTiersError } = await this.supabase
      .from('tariff_tiers')
      .delete()
      .eq('tariff_id', id)

    if (deleteTiersError) throw deleteTiersError

    if (tiers.length > 0) {
      const tiersToInsert = tiers.map(t => ({ ...t, tariff_id: id }))
      const { error: tiersError } = await this.supabase
        .from('tariff_tiers')
        .insert(tiersToInsert)

      if (tiersError) throw tiersError
    }

    return updatedTariff
  }
}
