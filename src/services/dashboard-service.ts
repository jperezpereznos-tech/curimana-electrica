import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type DashboardKPIs = {
  totalCollected: number
  totalDebt: number
  activeCustomers: number
  pendingReceipts: number
}

type RevenueEntry = { name: string; total: number }
type SectorEntry = { name: string; value: number }

export class DashboardService {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  async getDashboardData() {
    const { data, error } = await this.supabase.rpc('get_dashboard_kpis')
    if (error) throw new Error(`Dashboard RPC: ${error.message}`)

    const result = data as {
      total_collected: number
      total_debt: number
      active_customers: number
      pending_receipts: number
      revenue_history: { name: string; total: number }[]
      sector_consumption: { name: string; value: number }[]
    } | null

    return {
      kpis: {
        totalCollected: result?.total_collected ?? 0,
        totalDebt: result?.total_debt ?? 0,
        activeCustomers: result?.active_customers ?? 0,
        pendingReceipts: result?.pending_receipts ?? 0,
      } satisfies DashboardKPIs,
      revenueHistory: (result?.revenue_history ?? []) as RevenueEntry[],
      sectorData: (result?.sector_consumption ?? []) as SectorEntry[],
    }
  }

  async getSummaryKPIs() {
    const { kpis } = await this.getDashboardData()
    return kpis
  }

  async getRevenueHistory() {
    const { revenueHistory } = await this.getDashboardData()
    return revenueHistory
  }

  async getConsumptionBySector() {
    const { sectorData } = await this.getDashboardData()
    return sectorData
  }

  async getTopDebtors(limit: number = 5) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('id, full_name, supply_number, address, sector_id, sectors(name), current_debt')
      .eq('is_active', true)
      .gt('current_debt', 0)
      .order('current_debt', { ascending: false })
      .limit(limit)

    if (error) throw new Error(`Top deudores: ${error.message}`)

    return data?.map(c => ({
      ...c,
      sector: (c.sectors as { name: string } | null)?.name || 'Sin sector'
    })) || []
  }

}

export function getDashboardService(supabaseClient: SupabaseClient<Database>) {
  return new DashboardService(supabaseClient)
}
