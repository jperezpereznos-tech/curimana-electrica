import { getPeriodService } from '@/services/period-service'
import { createClient } from '@/lib/supabase/server'
import { PeriodsList } from './periods-list'
import { CreatePeriodButton } from './create-period-button'

export default async function PeriodsPage() {
  const supabase = await createClient()
  const periodService = getPeriodService(supabase)

  let periods: any[] = []
  try { periods = await periodService.getAllPeriods() } catch { }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Periodos de Facturacion</h2>
          <p className="text-muted-foreground">Control de ciclos mensuales y cierre de facturacion.</p>
        </div>
        <CreatePeriodButton />
      </div>

      <PeriodsList initialPeriods={periods} />
    </>
  )
}
