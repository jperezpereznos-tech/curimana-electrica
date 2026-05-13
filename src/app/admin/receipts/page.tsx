import { getReceiptService } from '@/services/receipt-service'
import { getCustomerService } from '@/services/customer-service'
import { getPeriodService } from '@/services/period-service'
import { createClient } from '@/lib/supabase/server'
import { ReceiptsList } from './receipts-list'
import type { ReceiptWithPeriod, PeriodRow } from '@/types/views'
import type { Database } from '@/types/database'

type MunicipalityConfig = Database['public']['Tables']['municipality_config']['Row']

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; status?: string; q?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const receiptService = getReceiptService(supabase)
  const periodService = getPeriodService(supabase)
  const customerService = getCustomerService(supabase)

  let receipts: ReceiptWithPeriod[] = []
  let periods: PeriodRow[] = []
  let errorMsg = ''

  try {
    let customerId: string | undefined
    if (params.q) {
      const customer = await customerService.getBySupplyNumber(params.q)
      if (customer) customerId = customer.id
    }
    receipts = await receiptService.getAllReceipts({
      periodId: params.period,
      status: params.status,
      customerId,
    })
  } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

  try { periods = await periodService.getAllPeriods() } catch (e) { errorMsg += (errorMsg ? ' | ' : '') + (e instanceof Error ? e.message : String(e)) }

  let municipalityConfig: MunicipalityConfig | null = null
  try {
    const { data } = await supabase.from('municipality_config').select('*').limit(1).single()
    municipalityConfig = data
  } catch (e) { console.error('Error fetching municipality_config:', e) }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Recibos Emitidos</h2>
          <p className="text-muted-foreground">Consulta y gestion de la facturacion historica.</p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
          Error: {errorMsg}
        </div>
      )}

      <ReceiptsList
        initialReceipts={receipts || []}
        periods={periods}
        currentFilters={params}
        municipalityConfig={municipalityConfig}
      />
    </>
  )
}
