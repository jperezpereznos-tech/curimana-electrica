import { getPaymentService } from '@/services/payment-service'
import { createClient } from '@/lib/supabase/server'
import { PaymentsList } from './payments-list'
import type { PaymentWithDetails } from '@/types/views'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; cashierId?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const paymentService = getPaymentService(supabase)
  let payments: PaymentWithDetails[] = []
  let fetchError = false
  try {
    payments = await paymentService.getAllPayments({
      cashierId: params.cashierId,
      from: params.from,
      to: params.to,
    })
  } catch (e) { console.error('Payments page fetch failed:', e); fetchError = true }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pagos Registrados</h2>
          <p className="text-muted-foreground">Historial completo de cobros realizados.</p>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error al cargar datos. Verifique su conexion y recargue la pagina.
        </div>
      )}

      <PaymentsList initialPayments={payments || []} currentFilters={params} />
    </>
  )
}
