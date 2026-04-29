import { AdminLayout } from '@/components/layouts/admin-layout'
import { periodService } from '@/services/period-service'
import { PeriodsList } from './periods-list'
import { CreatePeriodButton } from './create-period-button'

export default async function PeriodsPage() {
  const periods = await periodService.getAllPeriods()

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Periodos de Facturación</h2>
          <p className="text-muted-foreground">Control de ciclos mensuales y cierre de facturación.</p>
        </div>
        <CreatePeriodButton />
      </div>

      <PeriodsList initialPeriods={periods} />
    </AdminLayout>
  )
}
