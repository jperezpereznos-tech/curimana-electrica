import { getConceptService } from '@/services/concept-service'
import { getTariffService } from '@/services/tariff-service'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { ConceptsList } from './concepts-list'
import { StaggerReveal } from '@/components/stagger-reveal'
import type { ConceptRow, TariffRow } from '@/types/views'

const CreateConceptDialog = dynamic(() => import('./create-concept-dialog').then(m => ({ default: m.CreateConceptDialog })))

export default async function ConceptsPage() {
  const supabase = await createClient()
  const conceptService = getConceptService(supabase)
  const tariffService = getTariffService(supabase)

  let concepts: ConceptRow[] = []
  let tariffs: TariffRow[] = []
  let errorMsg = ''

  try {
    [concepts, tariffs] = await Promise.all([
      conceptService.getAllConcepts(),
      tariffService.getAllTariffs()
    ])
  } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

  return (
    <StaggerReveal>
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Conceptos de Cobro</h2>
        <p className="text-muted-foreground">Cargos fijos y variables adicionales al consumo.</p>
      </div>
      <CreateConceptDialog tariffs={tariffs} />
    </div>

    {errorMsg && (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
        Error: {errorMsg}
      </div>
    )}

    <ConceptsList initialConcepts={concepts} tariffs={tariffs} />
    </StaggerReveal>
  )
}
