import { getCustomerService } from '@/services/customer-service'
import { getTariffService } from '@/services/tariff-service'
import { getSectorService } from '@/services/sector-service'
import { createClient } from '@/lib/supabase/server'
import { CustomersList } from './customers-list'
import { CreateCustomerDialog } from './create-customer-dialog'
import type { CustomerWithRelations, TariffRow, SectorRow } from '@/types/views'

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const supabase = await createClient()
  const customerService = getCustomerService(supabase)
  const tariffService = getTariffService(supabase)
  const sectorService = getSectorService(supabase)

  let customers: CustomerWithRelations[] = []
  let tariffs: TariffRow[] = []
  let sectors: SectorRow[] = []
  let fetchError = false

  try {
    [customers, tariffs, sectors] = await Promise.all([
      customerService.searchCustomers(q || ''),
      tariffService.getAllTariffs(),
      sectorService.getActiveSectors()
    ])
  } catch (e) { console.error('Customers page fetch failed:', e); fetchError = true }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion de Clientes</h2>
          <p className="text-muted-foreground">Administra el padron de suministros electricos.</p>
        </div>
        <CreateCustomerDialog tariffs={tariffs} sectors={sectors} />
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error al cargar datos. Verifique su conexion y recargue la pagina.
        </div>
      )}

      <CustomersList initialCustomers={customers} query={q || ''} tariffs={tariffs} sectors={sectors} />
    </>
  )
}
