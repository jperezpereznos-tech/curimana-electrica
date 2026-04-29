import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export class DashboardService {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  async getSummaryKPIs() {
    // 1. Recaudación Mes Actual (Pagos realizados en el mes actual)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0,0,0,0)

    const { data: payments } = await this.supabase
      .from('payments')
      .select('amount')
      .gte('created_at', startOfMonth.toISOString())

    const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

    // 2. Deuda Total Pendiente
    const { data: customers } = await this.supabase
      .from('customers')
      .select('current_debt')
      .eq('is_active', true)

    const totalDebt = customers?.reduce((sum, c) => sum + (c.current_debt || 0), 0) || 0

    // 3. Cantidad de Clientes Activos
    const { count: activeCustomers } = await this.supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // 4. Recibos Pendientes del Periodo Actual
    const { count: pendingReceipts } = await this.supabase
      .from('receipts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return {
      totalCollected,
      totalDebt,
      activeCustomers: activeCustomers || 0,
      pendingReceipts: pendingReceipts || 0
    }
  }

  async getRevenueHistory() {
    // Simulamos historial de 6 meses para el gráfico
    // En producción se haría un group by por billing_period
    const { data: periods } = await this.supabase
      .from('billing_periods')
      .select('name, receipts(sum(paid_amount))')
      .order('year', { ascending: true })
      .order('month', { ascending: true })
      .limit(6)

    return periods?.map(p => ({
      name: p.name,
      total: (p.receipts as any)?.reduce((sum: number, r: any) => sum + (r.paid_amount || 0), 0) || 0
    })) || []
  }

  async getConsumptionBySector() {
    const { data } = await this.supabase
      .from('customers')
      .select('sector, readings(consumption)')
      .eq('is_active', true)

    const sectors: Record<string, number> = {}
    data?.forEach(c => {
      const consumption = (c.readings as any)?.reduce((sum: number, r: any) => sum + (r.consumption || 0), 0) || 0
      const sectorKey = c.sector || 'Sin Sector'
      sectors[sectorKey] = (sectors[sectorKey] || 0) + consumption
    })

    return Object.entries(sectors).map(([name, value]) => ({ name, value }))
  }
}

export function getDashboardService(supabaseClient: SupabaseClient<Database>) {
  return new DashboardService(supabaseClient)
}
