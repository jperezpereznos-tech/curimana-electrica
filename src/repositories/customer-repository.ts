import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import type { CustomerWithRelations } from '@/types/views'

type Customer = Database['public']['Tables']['customers']['Row']

export class CustomerRepository extends BaseRepository<'customers'> {
  constructor(supabaseClient: SupabaseClient<Database>) {
    super('customers', supabaseClient)
  }

  async searchCustomers(query: string, sectorId?: string): Promise<CustomerWithRelations[]> {
    let queryBuilder = this.supabase
      .from('customers')
      .select('*, tariffs(name, tariff_tiers(*)), sectors(id, name, code), readings(current_reading, reading_date)')

    if (sectorId) {
      queryBuilder = queryBuilder.eq('sector_id', sectorId)
    }

    if (query && query.length >= 2) {
      const escaped = query.replace(/[%_\\]/g, '\\$&')
      queryBuilder = queryBuilder.or(`full_name.ilike.%${escaped}%,supply_number.ilike.%${escaped}%,document_number.ilike.%${escaped}%`)
    }

    const { data, error } = await queryBuilder
      .order('full_name', { ascending: true })
      .limit(50)

    if (error) throw new Error(error.message)

    const processed = (data as CustomerWithRelations[]).map((c) => ({
      ...c,
      readings: c.readings?.sort((a, b) =>
        new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      ).slice(0, 1) || []
    }))

    return processed
  }

  async getBySupplyNumber(supplyNumber: string): Promise<CustomerWithRelations | null> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*, tariffs(name, tariff_tiers(*)), sectors(id, name, code), readings(current_reading, reading_date)')
      .eq('supply_number', supplyNumber)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return null

    const processed = {
      ...data,
      readings: (data as CustomerWithRelations).readings?.sort((a, b) =>
        new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      ).slice(0, 1) || []
    } as CustomerWithRelations

    return processed
  }

  async getCustomerDetails(id: string) {
    const [customerResult, readingsResult, receiptsResult] = await Promise.all([
      this.supabase
        .from('customers')
        .select('*, tariffs(*), sectors(id, name, code)')
        .eq('id', id)
        .single(),
      this.supabase
        .from('readings')
        .select('*, billing_periods(*)')
        .eq('customer_id', id)
        .order('reading_date', { ascending: false })
        .limit(12),
      this.supabase
        .from('receipts')
        .select('*, billing_periods(*)')
        .eq('customer_id', id)
        .order('issue_date', { ascending: false })
        .limit(12),
    ])

    if (customerResult.error) throw new Error(customerResult.error.message)

    return {
      customer: customerResult.data,
      readings: readingsResult.data || [],
      receipts: receiptsResult.data || []
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

      if (error) throw new Error(error.message)
      if (count === 0) return random
    }

    throw new Error('No se pudo generar un número de suministro único')
  }

  async getTopDebtors(limit: number = 5) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('id, full_name, supply_number, current_debt, address, sectors(id, name)')
      .eq('is_active', true)
      .gt('current_debt', 0)
      .order('current_debt', { ascending: false })
      .limit(limit)

    if (error) throw new Error(error.message)
    return data
  }

  async getActiveCustomersWithReadings(sectorId?: string) {
    let query = this.supabase
      .from('customers')
      .select('id, supply_number, full_name, address, sector_id, is_active, readings(id, current_reading, reading_date), sectors(id, name, code)')
      .eq('is_active', true)

    if (sectorId) {
      query = query.eq('sector_id', sectorId)
    }

    const { data, error } = await query
      .order('sector_id', { ascending: true })
      .order('full_name', { ascending: true })

    if (error) throw new Error(error.message)
    return data
  }

  async getAllForCache(sectorId?: string) {
    let query = this.supabase
      .from('customers')
      .select('id, supply_number, full_name, address, sector_id, tariff_id, is_active, readings(current_reading, reading_date), sectors(name)')
      .eq('is_active', true)

    if (sectorId) {
      query = query.eq('sector_id', sectorId)
    }

    const { data, error } = await query
      .order('full_name', { ascending: true })

    if (error) throw new Error(error.message)

    const processed = (data as (Customer & { readings: { current_reading: number; reading_date: string }[]; sectors: { name: string } | null })[]).map((c) => {
      const latestReading = c.readings?.sort((a, b) =>
        new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      )[0]
      return {
        id: c.id,
        supply_number: c.supply_number,
        full_name: c.full_name,
        address: c.address || '',
        sectorName: c.sectors?.name || '',
      sector: c.sectors?.name || '',
        sector_id: c.sector_id || '',
        tariff_id: c.tariff_id || '',
        previous_reading: latestReading?.current_reading || 0,
      }
    })

    return processed
  }
}
