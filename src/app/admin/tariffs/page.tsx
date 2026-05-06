import { getTariffService } from '@/services/tariff-service'
import { createClient } from '@/lib/supabase/server'
import { TariffsList } from './tariffs-list'
import { CreateTariffDialog } from './create-tariff-dialog'
import type { TariffWithTiers } from '@/types/views'

export default async function TariffsPage() {
  const supabase = await createClient()
  const tariffService = getTariffService(supabase)

  let tariffs: TariffWithTiers[] = []
  let errorMsg = ''
  try { tariffs = await tariffService.getAllTariffs() } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tarifas y Tramos</h2>
          <p className="text-muted-foreground">Configuracion de precios por consumo electrico.</p>
        </div>
        <CreateTariffDialog />
      </div>

      {errorMsg && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error: {errorMsg}
        </div>
      )}

      <TariffsList initialTariffs={tariffs} />
    </>
  )
}
