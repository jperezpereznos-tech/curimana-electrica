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

  let receipts: any[] = []
  let periods: any[] = []

  try {
    receipts = await receiptService.getAllReceipts({
      periodId: params.period,
      status: params.status,
      supplyNumber: params.q
    })
  } catch { }

  try { periods = await periodService.getAllPeriods() } catch { }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recibos Emitidos</h2>
          <p className="text-muted-foreground">Consulta y gestion de la facturacion historica.</p>
        </div>
      </div>

      <ReceiptsList
        initialReceipts={receipts || []}
        periods={periods}
        currentFilters={params}
      />
    </>
  )
}
