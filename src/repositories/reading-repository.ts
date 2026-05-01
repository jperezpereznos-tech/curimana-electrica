import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Reading = Database['public']['Tables']['readings']['Row']

export class ReadingRepository extends BaseRepository<'readings'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('readings', supabaseClient)
  }

  async getLatestReadingByCustomer(customerId: string): Promise<Reading | null> {
    const { data, error } = await this.supabase
      .from('readings')
      .select('*')
      .eq('customer_id', customerId)
      .order('reading_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async getReadingsByPeriod(periodId: string) {
    const { data, error } = await this.supabase
      .from('readings')
      .select('*, customers(full_name, supply_number)')
      .eq('billing_period_id', periodId)
      .order('reading_date', { ascending: false })

    if (error) throw error
    return data
  }

  async getPendingReadingsCount(periodId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    if (error) throw error
    return count || 0
  }

  async getLatestReadings() {
    const { data, error } = await this.supabase
      .from('readings')
      .select('id, previous_reading, current_reading, consumption, reading_date, photo_url, customers(full_name, supply_number)')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    return data
  }
}

export const readingRepository = new ReadingRepository()
