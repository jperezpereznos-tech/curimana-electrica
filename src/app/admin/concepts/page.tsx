import { getConceptService } from '@/services/concept-service'
import { getTariffService } from '@/services/tariff-service'
import { createClient } from '@/lib/supabase/server'
import { ConceptsList } from './concepts-list'
import { CreateConceptDialog } from './create-concept-dialog'
import type { ConceptRow, TariffRow } from '@/types/views'

export default async function ConceptsPage() {
  const supabase = await createClient()
  const conceptService = getConceptService(supabase)
  const tariffService = getTariffService(supabase)

  let concepts: ConceptRow[] = []
  let tariffs: TariffRow[] = []
  let fetchError = false

  try {
    [concepts, tariffs] = await Promise.all([
      conceptService.getAllConcepts(),
      tariffService.getAllTariffs()
    ])
  } catch (e) { console.error('Concepts page fetch failed:', e); fetchError = true }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conceptos de Cobro</h2>
          <p className="text-muted-foreground">Cargos fijos y variables adicionales al consumo.</p>
        </div>
        <CreateConceptDialog tariffs={tariffs} />
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error al cargar datos. Verifique su conexion y recargue la pagina.
        </div>
      )}

      <ConceptsList initialConcepts={concepts} tariffs={tariffs} />
    </>
  )
}
