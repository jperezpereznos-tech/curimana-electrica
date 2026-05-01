import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Period = Database['public']['Tables']['billing_periods']['Row']

export class PeriodRepository extends BaseRepository<'billing_periods'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('billing_periods', supabaseClient)
  }

  async getCurrentPeriod(): Promise<Period | null> {
    const { data, error } = await this.supabase
      .from('billing_periods')
      .select('*')
      .eq('is_closed', false)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async getAllPeriods(): Promise<Period[]> {
    const { data, error } = await this.supabase
      .from('billing_periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (error) throw error
    return data || []
  }
}

export const periodRepository = new PeriodRepository()
