import { getPeriodService } from '@/services/period-service'
import { createClient } from '@/lib/supabase/server'
import { PeriodsList } from './periods-list'
import { CreatePeriodButton } from './create-period-button'
import { StaggerReveal } from '@/components/stagger-reveal'
import type { PeriodRow } from '@/types/views'

export default async function PeriodsPage() {
  const supabase = await createClient()
  const periodService = getPeriodService(supabase)

  let periods: PeriodRow[] = []
  let errorMsg = ''
  try { periods = await periodService.getAllPeriods() } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

  return (
    <StaggerReveal>
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Periodos de Facturacion</h2>
        <p className="text-muted-foreground">Control de ciclos mensuales y cierre de facturacion.</p>
      </div>
      <CreatePeriodButton />
    </div>

    {errorMsg && (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
        Error: {errorMsg}
      </div>
    )}

    <PeriodsList initialPeriods={periods} />
    </StaggerReveal>
  )
}
