import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']

export class CustomerRepository extends BaseRepository<'customers'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('customers', supabaseClient)
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    let queryBuilder = this.supabase
      .from('customers')
      .select('*, tariffs(name, tariff_tiers(*))')

    if (query && query.length >= 2) {
      queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,supply_number.ilike.%${query}%,document_number.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder
      .order('full_name', { ascending: true })
      .limit(50)

    if (error) throw error
    return data as any
  }

  async getCustomerDetails(id: string) {
    const { data: customer, error: customerError } = await this.supabase
      .from('customers')
      .select('*, tariffs(*)')
      .eq('id', id)
      .single()

    if (customerError) throw customerError

    const { data: readings } = await this.supabase
      .from('readings')
      .select('*, billing_periods(*)')
      .eq('customer_id', id)
      .order('reading_date', { ascending: false })
      .limit(12)

    const { data: receipts } = await this.supabase
      .from('receipts')
      .select('*, billing_periods(*)')
      .eq('customer_id', id)
      .order('issue_date', { ascending: false })
      .limit(12)

    return {
      customer,
      readings: readings || [],
      receipts: receipts || []
    }
  }

  async generateSupplyNumber(): Promise<string> {
    let unique = false
    let supplyNumber = ''

    while (!unique) {
      const random = Math.floor(100000000 + Math.random() * 900000000).toString()
      supplyNumber = random

      const { count } = await this.supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('supply_number', supplyNumber)

      if (count === 0) unique = true
    }

    return supplyNumber
  }

  async getTopDebtors(limit: number = 5) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('id, full_name, supply_number, current_debt, sector, address')
      .eq('is_active', true)
      .gt('current_debt', 0)
      .order('current_debt', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  async getActiveCustomersWithReadings() {
    const { data, error } = await this.supabase
      .from('customers')
      .select('id, supply_number, full_name, address, sector, is_active, readings(id, reading_date)')
      .eq('is_active', true)
      .order('sector', { ascending: true })
      .order('full_name', { ascending: true })

    if (error) throw error
    return data
  }
}
