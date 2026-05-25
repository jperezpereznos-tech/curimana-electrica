import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type CashClosure = Database['public']['Tables']['cash_closures']['Row']

export class CashClosureRepository extends BaseRepository<'cash_closures'> {
  constructor(supabaseClient: SupabaseClient<Database>) {
    super('cash_closures', supabaseClient)
  }

  async getActiveClosure(userId: string): Promise<CashClosure | null> {
    const { data, error } = await this.supabase
      .from('cash_closures')
      .select('*')
      .eq('cashier_id', userId)
      .eq('status', 'open')
      .maybeSingle()

    if (error) throw new Error(error.message)
    return data
  }

  async getSessionTotal(cashierId: string, from: string, cashClosureId?: string): Promise<{ total: number; count: number }> {
    const { data, error } = await this.supabase
      .rpc('get_session_total', {
        p_cashier_id: cashierId,
        p_from: from,
        p_cash_closure_id: cashClosureId ?? null,
      })

    if (error) throw new Error(error.message)
    const row = (data as { total: number; count: number }[] | null)?.[0]
    return { total: Number(row?.total ?? 0), count: Number(row?.count ?? 0) }
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

    if (error) throw new Error(error.message)
    return closure
  }
}
