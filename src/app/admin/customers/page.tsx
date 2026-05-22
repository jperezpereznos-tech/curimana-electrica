import { getCustomerService } from '@/services/customer-service'
import { getTariffService } from '@/services/tariff-service'
import { getSectorService } from '@/services/sector-service'
import { createClient } from '@/lib/supabase/server'
import dynamic from 'next/dynamic'
import { CustomersList } from './customers-list'
import type { CustomerWithRelations, TariffRow, SectorRow } from '@/types/views'

const CreateCustomerDialog = dynamic(() => import('./create-customer-dialog').then(m => ({ default: m.CreateCustomerDialog })))

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
  let errorMsg = ''

  try {
    [customers, tariffs, sectors] = await Promise.all([
      customerService.searchCustomers(q || ''),
      tariffService.getAllTariffs(),
      sectorService.getActiveSectors()
    ])
  } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestion de Clientes</h2>
          <p className="text-muted-foreground">Administra el padron de suministros electricos.</p>
        </div>
        <CreateCustomerDialog tariffs={tariffs} sectors={sectors} />
      </div>

      {errorMsg && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error: {errorMsg}
        </div>
      )}

      <CustomersList initialCustomers={customers} query={q || ''} tariffs={tariffs} sectors={sectors} />
    </>
  )
}
