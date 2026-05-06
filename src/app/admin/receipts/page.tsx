import { getReceiptService } from '@/services/receipt-service'
import { getPeriodService } from '@/services/period-service'
import { createClient } from '@/lib/supabase/server'
import { ReceiptsList } from './receipts-list'
import type { ReceiptWithPeriod, PeriodRow } from '@/types/views'

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const receiptService = getReceiptService(supabase)
  const periodService = getPeriodService(supabase)

  let receipts: ReceiptWithPeriod[] = []
  let periods: PeriodRow[] = []
  let fetchError = false

  try {
    receipts = await receiptService.getAllReceipts({
      periodId: params.period,
      status: params.status,
      supplyNumber: params.q
    })
  } catch (e) { console.error('Receipts page fetch failed:', e); fetchError = true }

  try { periods = await periodService.getAllPeriods() } catch (e) { console.error('Receipts periods fetch failed:', e); fetchError = true }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recibos Emitidos</h2>
          <p className="text-muted-foreground">Consulta y gestion de la facturacion historica.</p>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error al cargar datos. Verifique su conexion y recargue la pagina.
        </div>
      )}

      <ReceiptsList
        initialReceipts={receipts || []}
        periods={periods}
        currentFilters={params}
      />
    </>
  )
}
