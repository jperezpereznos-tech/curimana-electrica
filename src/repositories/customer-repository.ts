import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']

export class CustomerRepository extends BaseRepository<'customers'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('customers', supabaseClient)
  }

  async searchCustomers(query: string, sectorId?: string): Promise<Customer[]> {
    let queryBuilder = this.supabase
      .from('customers')
      .select('*, tariffs(name, tariff_tiers(*)), sectors(id, name, code), readings(current_reading, reading_date)')

    if (sectorId) {
      queryBuilder = queryBuilder.eq('sector_id', sectorId)
    }

    if (query && query.length >= 2) {
      queryBuilder = queryBuilder.or(`full_name.ilike.%${query}%,supply_number.ilike.%${query}%,document_number.ilike.%${query}%`)
    }

    const { data, error } = await queryBuilder
      .order('full_name', { ascending: true })
      .limit(50)

    if (error) throw error

    const processed = (data as any[]).map((c: any) => ({
      ...c,
      readings: c.readings?.sort((a: any, b: any) =>
        new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      ).slice(0, 1) || []
    }))

    return processed as any
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
    const maxAttempts = 10
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const random = Math.floor(100000000 + Math.random() * 900000000).toString()

      const { count, error } = await this.supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('supply_number', random)

      if (error) throw error
      if (count === 0) return random
    }

    throw new Error('No se pudo generar un número de suministro único')
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

  async getActiveCustomersWithReadings(sectorId?: string) {
    let query = this.supabase
      .from('customers')
      .select('id, supply_number, full_name, address, sector, sector_id, is_active, readings(id, reading_date), sectors(id, name, code)')
      .eq('is_active', true)

    if (sectorId) {
      query = query.eq('sector_id', sectorId)
    }

    const { data, error } = await query
      .order('sector', { ascending: true })
      .order('full_name', { ascending: true })

    if (error) throw error
    return data
  }

  async getAllForCache(sectorId?: string) {
    let query = this.supabase
      .from('customers')
      .select('id, supply_number, full_name, address, sector, sector_id, tariff_id, is_active, readings(current_reading, reading_date)')
      .eq('is_active', true)

    if (sectorId) {
      query = query.eq('sector_id', sectorId)
    }

    const { data, error } = await query
      .order('full_name', { ascending: true })

    if (error) throw error

    const processed = (data as any[]).map((c: any) => {
      const latestReading = c.readings?.sort((a: any, b: any) =>
        new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      )[0]
      return {
        id: c.id,
        supply_number: c.supply_number,
        full_name: c.full_name,
        address: c.address || '',
        sector: c.sector || '',
        sector_id: c.sector_id || '',
        tariff_id: c.tariff_id || '',
        previous_reading: latestReading?.current_reading || 0,
      }
    })

    return processed
  }
}
