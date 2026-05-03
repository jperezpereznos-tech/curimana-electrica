import { AdminLayout } from '@/components/layouts/admin-layout'
import { getPaymentService } from '@/services/payment-service'
import { createClient } from '@/lib/supabase/server'
import { PaymentsList } from './payments-list'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cashierId?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const paymentService = getPaymentService(supabase)
  let payments: any[] = []
  try {
    payments = await paymentService.getAllPayments({
      cashierId: params.cashierId,
      from: params.from,
      to: params.to,
    })
  } catch { }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pagos Registrados</h2>
          <p className="text-muted-foreground">Historial completo de cobros realizados.</p>
        </div>
      </div>

      <PaymentsList initialPayments={payments || []} currentFilters={params} />
    </AdminLayout>
  )
}
