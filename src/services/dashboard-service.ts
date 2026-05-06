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

 const { data: payments, error: paymentsErr } = await this.supabase
 .from('payments')
 .select('amount')
 .eq('status', 'completed')
 .gte('created_at', startOfMonth.toISOString())
 if (paymentsErr) throw new Error(`KPI payments: ${paymentsErr.message}`)

 const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

 const { data: customers, error: customersErr } = await this.supabase
 .from('customers')
 .select('current_debt')
 .eq('is_active', true)
 if (customersErr) throw new Error(`KPI deuda: ${customersErr.message}`)

 const totalDebt = customers?.reduce((sum, c) => sum + (c.current_debt || 0), 0) || 0

 const { count: activeCustomers, error: countErr } = await this.supabase
 .from('customers')
 .select('*', { count: 'exact', head: true })
 .eq('is_active', true)
 if (countErr) throw new Error(`KPI clientes: ${countErr.message}`)

 const { data: currentPeriod, error: periodErr } = await this.supabase
 .from('billing_periods')
 .select('id')
 .eq('is_closed', false)
 .limit(1)
 .maybeSingle()
 if (periodErr) throw new Error(`KPI periodos: ${periodErr.message}`)

 let pendingReceipts = 0
 if (currentPeriod) {
 const { count, error: receiptsErr } = await this.supabase
 .from('receipts')
 .select('*', { count: 'exact', head: true })
 .eq('billing_period_id', currentPeriod.id)
 .in('status', ['pending', 'partial'])
 if (receiptsErr) throw new Error(`KPI recibos: ${receiptsErr.message}`)
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
 const { data: periods, error: revenueErr } = await this.supabase
 .from('billing_periods')
 .select('name, receipts!inner(paid_amount, status)')
 .order('year', { ascending: true })
 .order('month', { ascending: true })
 .limit(6)
 if (revenueErr) throw new Error(`Ingresos: ${revenueErr.message}`)

    return periods?.map(p => {
      const receipts = (p.receipts as { paid_amount: number; status: string }[] | null) ?? []
      return {
        name: p.name,
        total: receipts
          .filter(r => r.status === 'paid')
          .reduce((sum, r) => sum + (r.paid_amount || 0), 0)
      }
    }) ?? []
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

 if (error) throw new Error(`Sectores: ${error.message}`)

    const sectors: Record<string, number> = {}
    data?.forEach(r => {
      const sectorKey = (r.customers as { sector: string } | null)?.sector || 'Sin Sector'
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

 if (error) throw new Error(`Top deudores: ${error.message}`)

    return data || []
  }

  // Últimas lecturas registradas
  async getLatestReadings(limit: number = 5) {
    const { data, error } = await this.supabase
      .from('readings')
      .select('id, previous_reading, current_reading, consumption, reading_date, photo_url, customers(full_name, supply_number)')
      .order('created_at', { ascending: false })
      .limit(limit)

 if (error) throw new Error(`Ultimas lecturas: ${error.message}`)

  return data?.map(r => ({
    id: r.id,
    previous_reading: r.previous_reading,
    current_reading: r.current_reading,
    consumption: r.consumption,
    reading_date: r.reading_date,
    has_photo: !!r.photo_url,
    customer_name: (r.customers as { full_name: string; supply_number: string } | null)?.full_name || 'Desconocido',
    supply_number: (r.customers as { full_name: string; supply_number: string } | null)?.supply_number || 'N/A'
  })) || []
  }
}

export function getDashboardService(supabaseClient: SupabaseClient<Database>) {
  return new DashboardService(supabaseClient)
}
