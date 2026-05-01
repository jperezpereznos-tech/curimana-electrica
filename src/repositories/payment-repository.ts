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

  async getPaymentsByCashier(cashierId: string, dateFilter?: { from?: string; to?: string }) {
    let query = this.supabase
      .from('payments')
      .select('*, receipts(receipt_number, customers(full_name, supply_number))')
      .eq('cashier_id', cashierId)

    if (dateFilter?.from) query = query.gte('payment_date', dateFilter.from)
    if (dateFilter?.to) query = query.lte('payment_date', dateFilter.to)

    const { data, error } = await query.order('payment_date', { ascending: false })

    if (error) throw error
    return data
  }

  async getAllPayments(filters?: { periodId?: string; cashierId?: string; from?: string; to?: string }) {
    let query = this.supabase
      .from('payments')
      .select('*, receipts(receipt_number, customers(full_name, supply_number)), cashier:profiles!cashier_id(full_name)')
      .order('payment_date', { ascending: false })

    if (filters?.cashierId) query = query.eq('cashier_id', filters.cashierId)
    if (filters?.from) query = query.gte('payment_date', filters.from)
    if (filters?.to) query = query.lte('payment_date', filters.to)

    const { data, error } = await query

    if (error) throw error
    return data
  }
}

export const paymentRepository = new PaymentRepository()
