import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class MunicipalityConfigRepository extends BaseRepository<'municipality_config'> {
  constructor(supabaseClient: SupabaseClient<Database>) {
    super('municipality_config', supabaseClient)
  }

  async getConfig() {
    const { data, error } = await this.supabase
      .from('municipality_config')
      .select('*')
      .limit(1)
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async getBillingCutDay() {
    const { data, error } = await this.supabase
      .from('municipality_config')
      .select('billing_cut_day')
      .limit(1)
      .single()

    if (error) throw new Error(error.message)
    return data?.billing_cut_day ?? 26
  }

  async getPaymentGraceDays() {
    const { data, error } = await this.supabase
      .from('municipality_config')
      .select('payment_grace_days')
      .limit(1)
      .single()

    if (error) throw new Error(error.message)
    return data?.payment_grace_days ?? 20
  }

  async getBasicInfo() {
    const { data, error } = await this.supabase
      .from('municipality_config')
      .select('ruc, name')
      .limit(1)
      .single()

    if (error) throw new Error(error.message)
    return data
  }

  async updateConfig(id: string, payload: Database['public']['Tables']['municipality_config']['Update']) {
    return await this.update(id, payload)
  }
}
