import { AdminLayout } from '@/components/layouts/admin-layout'
import { getDashboardService } from '@/services/dashboard-service'
import { createClient } from '@/lib/supabase/server'
import { KPICard, RevenueChart, SectorConsumptionChart } from './dashboard-components'
import { TopDebtors } from './top-debtors'
import { LatestReadings } from './latest-readings'
import { TrendingUp, Users, CreditCard, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DownloadReports } from './download-reports'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const dashboardService = getDashboardService(supabase)

  let kpis = { totalCollected: 0, totalDebt: 0, activeCustomers: 0, pendingReceipts: 0 }
  let revenueHistory: any[] = []
  let sectorData: any[] = []

  try { kpis = await dashboardService.getSummaryKPIs() } catch { }
  try { revenueHistory = await dashboardService.getRevenueHistory() } catch { }
  try { sectorData = await dashboardService.getConsumptionBySector() } catch { }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Panel Administrativo</h2>
            <p className="text-muted-foreground">Estado general del sistema eléctrico de Curimana.</p>
          </div>
          <DownloadReports />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Recaudación del Mes"
          value={formatCurrency(kpis.totalCollected)}
          subtext="Pagos registrados en este mes"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
          <KPICard 
            title="Deuda Pendiente" 
            value={formatCurrency(kpis.totalDebt)} 
            subtext="Monto total por cobrar"
            icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          />
          <KPICard 
            title="Clientes Activos" 
            value={kpis.activeCustomers} 
            subtext="Suministros registrados"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <KPICard 
            title="Recibos Pendientes" 
            value={kpis.pendingReceipts} 
            subtext="Del periodo actual"
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          />
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <RevenueChart data={revenueHistory} />
          <SectorConsumptionChart data={sectorData} />
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <TopDebtors />
          <LatestReadings />
        </div>
      </div>
    </AdminLayout>
  )
}