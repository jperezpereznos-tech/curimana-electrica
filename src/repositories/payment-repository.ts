import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type PaymentInsert = Database['public']['Tables']['payments']['Insert']

export class PaymentRepository extends BaseRepository<'payments'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('payments', supabaseClient)
  }

  async createWithAudit(data: PaymentInsert) {
    const { data: payment, error } = await this.supabase
      .from('payments')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return payment
  }

  async getPaymentsByCashier(cashierId: string) {
    const { data, error } = await this.supabase
      .from('payments')
      .select('*, receipts(receipt_number, customers(full_name))')
      .eq('cashier_id', cashierId)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data
  }
}

export const paymentRepository = new PaymentRepository()
