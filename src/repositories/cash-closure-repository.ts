import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type CashClosure = Database['public']['Tables']['cash_closures']['Row']

export class CashClosureRepository extends BaseRepository<'cash_closures'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('cash_closures', supabaseClient)
  }

  async getActiveClosure(userId: string): Promise<CashClosure | null> {
    const { data, error } = await this.supabase
      .from('cash_closures')
      .select('*')
      .eq('cashier_id', userId)
      .eq('status', 'open')
      .maybeSingle()

    if (error) throw error
    return data
  }

  async getSessionTotal(cashierId: string, from: string): Promise<{ total: number; count: number }> {
    const { data, error } = await this.supabase
      .from('payments')
      .select('amount')
      .eq('cashier_id', cashierId)
      .gte('created_at', from)
      .neq('status', 'voided')

    if (error) throw error
    const payments = data ?? []
    const total = payments.reduce((sum, p) => sum + p.amount, 0)
    return { total, count: payments.length }
  }

  async close(id: string, data: {
    closed_at: string, total_collected: number, total_receipts: number
  }) {
    const { data: closure, error } = await this.supabase
      .from('cash_closures')
      .update({
        ...data,
        status: 'closed'
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return closure
  }
}
