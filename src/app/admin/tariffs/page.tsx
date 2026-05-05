import { getTariffService } from '@/services/tariff-service'
import { createClient } from '@/lib/supabase/server'
import { TariffsList } from './tariffs-list'
import { CreateTariffDialog } from './create-tariff-dialog'
import type { TariffWithTiers } from '@/types/views'

export default async function TariffsPage() {
  const supabase = await createClient()
  const tariffService = getTariffService(supabase)

  let tariffs: TariffWithTiers[] = []
  try { tariffs = await tariffService.getAllTariffs() } catch { }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tarifas y Tramos</h2>
          <p className="text-muted-foreground">Configuracion de precios por consumo electrico.</p>
        </div>
        <CreateTariffDialog />
      </div>

      <TariffsList initialTariffs={tariffs} />
    </>
  )
}
