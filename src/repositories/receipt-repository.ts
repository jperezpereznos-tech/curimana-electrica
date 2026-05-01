import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class ReceiptRepository extends BaseRepository<'receipts'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('receipts', supabaseClient)
  }

  async getAllWithDetails(filters?: {
    periodId?: string;
    status?: string;
    supplyNumber?: string
  }) {
    let query = this.supabase
      .from('receipts')
      .select('*, customers(full_name, supply_number), billing_periods(name)')
      .order('receipt_number', { ascending: false })

    if (filters?.periodId) query = query.eq('billing_period_id', filters.periodId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.supplyNumber) {
      query = query.filter('customers.supply_number', 'ilike', `%${filters.supplyNumber}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  async getByIdWithDetails(id: string) {
    const { data, error } = await this.supabase
      .from('receipts')
      .select('*, customers(*, tariffs(*, tariff_tiers(*))), billing_periods(*), readings(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }
}

export const receiptRepository = new ReceiptRepository()
