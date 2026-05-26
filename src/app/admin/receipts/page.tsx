import { getReceiptService } from '@/services/receipt-service'
import { getCustomerService } from '@/services/customer-service'
import { getPeriodService } from '@/services/period-service'
import { getMunicipalityConfigService } from '@/services/municipality-config-service'
import { createClient } from '@/lib/supabase/server'
import { ReceiptsList } from './receipts-list'
import { StaggerReveal } from '@/components/stagger-reveal'
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
  const customerService = getCustomerService(supabase)
  const configService = getMunicipalityConfigService(supabase)

  let receipts: ReceiptWithPeriod[] = []
  let periods: PeriodRow[] = []
  let municipalityConfig = null
  let errorMsg = ''

  try {
    let customerId: string | undefined
    if (params.q) {
      const [customerMatch, fetchedPeriods, fetchedConfig] = await Promise.all([
        customerService.getBySupplyNumber(params.q),
        periodService.getAllPeriods(),
        configService.getConfig().catch(e => { console.error('Error fetching municipality_config:', e); return null }),
      ])
      if (customerMatch) customerId = customerMatch.id
      periods = fetchedPeriods
      municipalityConfig = fetchedConfig
    }
    const receiptFilter = { periodId: params.period, status: params.status, customerId }
    receipts = await receiptService.getAllReceipts(receiptFilter)
    if (!params.q) {
      ;[periods, municipalityConfig] = await Promise.all([
        periodService.getAllPeriods(),
        configService.getConfig().catch(e => { console.error('Error fetching municipality_config:', e); return null }),
      ])
    }
  } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

  return (
    <StaggerReveal>
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Recibos Emitidos</h2>
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
    </StaggerReveal>
  )
}