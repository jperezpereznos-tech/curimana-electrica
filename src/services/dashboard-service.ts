import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export class DashboardService {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  async getSummaryKPIs() {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0,0,0,0)

    const { data: payments } = await this.supabase
      .from('payments')
      .select('amount')
      .gte('created_at', startOfMonth.toISOString())

    const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

    const { data: customers } = await this.supabase
      .from('customers')
      .select('current_debt')
      .eq('is_active', true)

    const totalDebt = customers?.reduce((sum, c) => sum + (c.current_debt || 0), 0) || 0

    const { count: activeCustomers } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const { data: currentPeriod } = await this.supabase
      .from('billing_periods')
      .select('id')
      .eq('is_closed', false)
      .limit(1)
      .maybeSingle()

    let pendingReceipts = 0
    if (currentPeriod) {
      const { count } = await this.supabase
        .from('receipts')
        .select('*', { count: 'exact', head: true })
        .eq('billing_period_id', currentPeriod.id)
        .in('status', ['pending', 'partial'])
      pendingReceipts = count || 0
    }

    return {
      totalCollected,
      totalDebt,
      activeCustomers: activeCustomers || 0,
      pendingReceipts
    }
  }

  async getRevenueHistory() {
    // Simulamos historial de 6 meses para el gráfico
    // En producción se haría un group by por billing_period
    const { data: periods } = await this.supabase
      .from('billing_periods')
      .select('name, receipts(paid_amount)')
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .limit(6)

    return periods?.map(p => ({
      name: p.name,
      total: (p.receipts as any[])?.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0) || 0
    })) || []
  }

  async getConsumptionBySector(periodId?: string) {
    let query = this.supabase
      .from('readings')
      .select('consumption, customers(sector)')
      .order('created_at', { ascending: false })

    if (periodId) {
      query = query.eq('billing_period_id', periodId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching consumption by sector:', error)
      return []
    }

    const sectors: Record<string, number> = {}
    data?.forEach(r => {
      const sectorKey = (r.customers as any)?.sector || 'Sin Sector'
      sectors[sectorKey] = (sectors[sectorKey] || 0) + (r.consumption || 0)
    })

    return Object.entries(sectors).map(([name, value]) => ({ name, value }))
  }

  // Top 5 clientes con mayor deuda
  async getTopDebtors(limit: number = 5) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('id, full_name, supply_number, address, sector, current_debt')
      .eq('is_active', true)
      .gt('current_debt', 0)
      .order('current_debt', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching top debtors:', error)
      return []
    }

    return data || []
  }

  // Últimas lecturas registradas
  async getLatestReadings(limit: number = 5) {
    const { data, error } = await this.supabase
      .from('readings')
      .select('id, previous_reading, current_reading, consumption, reading_date, photo_url, customers(full_name, supply_number)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching latest readings:', error)
      return []
    }

    return data?.map(r => ({
      id: r.id,
      previous_reading: r.previous_reading,
      current_reading: r.current_reading,
      consumption: r.consumption,
      reading_date: r.reading_date,
      has_photo: !!r.photo_url,
      customer_name: (r.customers as any)?.full_name || 'Desconocido',
      supply_number: (r.customers as any)?.supply_number || 'N/A'
    })) || []
  }
}

export function getDashboardService(supabaseClient: SupabaseClient<Database>) {
  return new DashboardService(supabaseClient)
}
