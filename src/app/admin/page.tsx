import { getDashboardService } from '@/services/dashboard-service'
import { createClient } from '@/lib/supabase/server'
import { KPICard, RevenueChart, SectorConsumptionChart } from './dashboard-components'
import { TopDebtors } from './top-debtors'
import { LatestReadings } from './latest-readings'
import { TrendingUp, Users, CreditCard, AlertCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { DownloadReports } from './download-reports'
import { Suspense } from 'react'
import type { RevenueEntry, SectorEntry } from '@/types/views'

function DashboardSkeleton() {
  return <div className="flex flex-col gap-8 animate-pulse"><div className="h-10 w-64 bg-muted rounded" /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg" />)}</div><div className="grid gap-4 grid-cols-1 md:grid-cols-3">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-[300px] bg-muted rounded-lg" />)}</div></div>
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: claimsData, error: authErr } = await supabase.auth.getClaims()
  const dashboardService = getDashboardService(supabase)

  let kpis = { totalCollected: 0, totalDebt: 0, activeCustomers: 0, pendingReceipts: 0 }
  let revenueHistory: RevenueEntry[] = []
  let sectorData: SectorEntry[] = []
  const fetchErrors: string[] = []

  if (authErr || !claimsData) {
    fetchErrors.push(`Sesion: ${authErr?.message || 'No autenticado'}`)
  } else {
    try {
      const dashboardData = await dashboardService.getDashboardData()
      kpis = dashboardData.kpis
      revenueHistory = dashboardData.revenueHistory
      sectorData = dashboardData.sectorData
    } catch (e) {
      fetchErrors.push(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel Administrativo</h2>
          <p className="text-muted-foreground">Estado general del sistema electrico de Curimana.</p>
        </div>
        <DownloadReports />
      </div>

      {fetchErrors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error al cargar: {fetchErrors.join(', ')}. Verifique su conexion y recargue la pagina.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Recaudacion del Mes"
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
        <Suspense fallback={<DashboardSkeleton />}>
          <TopDebtors />
        </Suspense>
        <Suspense fallback={<DashboardSkeleton />}>
          <LatestReadings />
        </Suspense>
      </div>
    </div>
  )
}
