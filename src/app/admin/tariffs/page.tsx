import { AdminLayout } from '@/components/layouts/admin-layout'
import { getTariffService } from '@/services/tariff-service'
import { createClient } from '@/lib/supabase/server'
import { TariffsList } from './tariffs-list'
import { CreateTariffDialog } from './create-tariff-dialog'

export default async function TariffsPage() {
  const supabase = await createClient()
  const tariffService = getTariffService(supabase)
  const tariffs = await tariffService.getAllTariffs()

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tarifas y Tramos</h2>
          <p className="text-muted-foreground">Configuración de precios por consumo eléctrico.</p>
        </div>
        <CreateTariffDialog />
      </div>

      <TariffsList initialTariffs={tariffs} />
    </AdminLayout>
  )
}
