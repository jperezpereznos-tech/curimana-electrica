import { AdminLayout } from '@/components/layouts/admin-layout'
import { getCustomerService } from '@/services/customer-service'
import { getTariffService } from '@/services/tariff-service'
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
  const customers = await customerService.searchCustomers(q || '')
  const tariffs = await tariffService.getAllTariffs()

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Clientes</h2>
          <p className="text-muted-foreground">Administra el padrón de suministros eléctricos.</p>
        </div>
        <CreateCustomerDialog tariffs={tariffs} />
      </div>

      <CustomersList initialCustomers={customers} query={q || ''} />
    </AdminLayout>
  )
}
