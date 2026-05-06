import { getPeriodService } from '@/services/period-service'
import { createClient } from '@/lib/supabase/server'
import { PeriodsList } from './periods-list'
import { CreatePeriodButton } from './create-period-button'
import type { PeriodRow } from '@/types/views'

export default async function PeriodsPage() {
  const supabase = await createClient()
  const periodService = getPeriodService(supabase)

  let periods: PeriodRow[] = []
  let fetchError = false
  try { periods = await periodService.getAllPeriods() } catch (e) { console.error('Periods page fetch failed:', e); fetchError = true }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Periodos de Facturacion</h2>
          <p className="text-muted-foreground">Control de ciclos mensuales y cierre de facturacion.</p>
        </div>
        <CreatePeriodButton />
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error al cargar datos. Verifique su conexion y recargue la pagina.
        </div>
      )}

      <PeriodsList initialPeriods={periods} />
    </>
  )
}
