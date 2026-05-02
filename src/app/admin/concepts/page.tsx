import { AdminLayout } from '@/components/layouts/admin-layout'
import { getConceptService } from '@/services/concept-service'
import { getTariffService } from '@/services/tariff-service'
import { createClient } from '@/lib/supabase/server'
import { ConceptsList } from './concepts-list'
import { CreateConceptDialog } from './create-concept-dialog'

export default async function ConceptsPage() {
  const supabase = await createClient()
  const conceptService = getConceptService(supabase)
  const tariffService = getTariffService(supabase)
  const [concepts, tariffs] = await Promise.all([
    conceptService.getAllConcepts(),
    tariffService.getAllTariffs()
  ])

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conceptos de Cobro</h2>
          <p className="text-muted-foreground">Cargos fijos y variables adicionales al consumo.</p>
        </div>
        <CreateConceptDialog tariffs={tariffs} />
      </div>

      <ConceptsList initialConcepts={concepts} tariffs={tariffs} />
    </AdminLayout>
  )
}
