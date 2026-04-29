import { BaseRepository } from './base'
import { Database } from '@/types/database'

type CashClosure = Database['public']['Tables']['cash_closures']['Row']

export class CashClosureRepository extends BaseRepository<'cash_closures'> {
  constructor() {
    super('cash_closures')
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

  async close(id: string, data: { 
    closed_at: string, 
    total_collected: number, 
    total_receipts: number 
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

export const cashClosureRepository = new CashClosureRepository()
