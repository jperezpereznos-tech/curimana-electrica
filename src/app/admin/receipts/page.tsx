import { AdminLayout } from '@/components/layouts/admin-layout'
import { getReceiptService } from '@/services/receipt-service'
import { getPeriodService } from '@/services/period-service'
import { createClient } from '@/lib/supabase/server'
import { ReceiptsList } from './receipts-list'

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const receiptService = getReceiptService(supabase)
  const periodService = getPeriodService(supabase)
  const receipts = await receiptService.getAllReceipts({
    periodId: params.period,
    status: params.status,
    supplyNumber: params.q
  })
  const periods = await periodService.getAllPeriods()

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recibos Emitidos</h2>
          <p className="text-muted-foreground">Consulta y gestión de la facturación histórica.</p>
        </div>
      </div>

      <ReceiptsList 
        initialReceipts={receipts || []} 
        periods={periods} 
        currentFilters={params}
      />
    </AdminLayout>
  )
}
