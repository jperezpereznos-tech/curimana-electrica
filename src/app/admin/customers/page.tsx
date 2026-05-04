import { getCustomerService } from '@/services/customer-service'
import { getTariffService } from '@/services/tariff-service'
import { getSectorService } from '@/services/sector-service'
import { createClient } from '@/lib/supabase/server'
import { CustomersList } from './customers-list'
import { CreateCustomerDialog } from './create-customer-dialog'

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

  let customers: any[] = []
  let tariffs: any[] = []
  let sectors: any[] = []

  try {
    [customers, tariffs, sectors] = await Promise.all([
      customerService.searchCustomers(q || ''),
      tariffService.getAllTariffs(),
      sectorService.getActiveSectors()
    ])
  } catch { }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion de Clientes</h2>
          <p className="text-muted-foreground">Administra el padron de suministros electricos.</p>
        </div>
        <CreateCustomerDialog tariffs={tariffs} sectors={sectors} />
      </div>

      <CustomersList initialCustomers={customers} query={q || ''} tariffs={tariffs} sectors={sectors} />
    </>
  )
}
