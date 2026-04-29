import { AdminLayout } from '@/components/layouts/admin-layout'
import { conceptService } from '@/services/concept-service'
import { ConceptsList } from './concepts-list'
import { CreateConceptDialog } from './create-concept-dialog'

export default async function ConceptsPage() {
  const concepts = await conceptService.getAllConcepts()

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Conceptos de Cobro</h2>
          <p className="text-muted-foreground">Cargos fijos y variables adicionales al consumo.</p>
        </div>
        <CreateConceptDialog />
      </div>

      <ConceptsList initialConcepts={concepts} />
    </AdminLayout>
  )
}
