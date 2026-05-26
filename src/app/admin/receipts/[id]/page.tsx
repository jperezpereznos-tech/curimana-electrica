import { getReceiptService } from '@/services/receipt-service'
import { getConceptService } from '@/services/concept-service'
import { getMunicipalityConfigService } from '@/services/municipality-config-service'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  FileText,
  ArrowLeft,
  User,
  Calendar,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { ReceiptDetailActions } from './receipt-actions'
import { StaggerReveal } from '@/components/stagger-reveal'
import dynamic from 'next/dynamic'
import './receipt-print.css'

const ReceiptPrintLayout = dynamic(() => import('@/components/receipt-print-layout').then(m => ({ default: m.ReceiptPrintLayout })))

export default async function ReceiptDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const receiptService = getReceiptService(supabase)
  const conceptService = getConceptService(supabase)
  const configService = getMunicipalityConfigService(supabase)

  const [receipt, concepts, municipalityConfig] = await Promise.all([
    receiptService.getReceiptDetails(id),
    conceptService.getActiveConcepts().catch(e => { console.error('Error fetching concepts:', e); return [] as import('@/types/views').ConceptRow[] }),
    configService.getConfig().catch(e => { console.error('Error fetching municipality_config:', e); return null }),
  ])

  if (!receipt) {
    return notFound()
  }

  const tariffTiers = receipt.customers?.tariffs?.tariff_tiers ?? []
  const sortedTiers = [...tariffTiers].sort((a, b) => a.min_kwh - b.min_kwh)

  const fixedConcepts = concepts.map(c => ({
    name: c.name,
    amount: c.amount,
    type: c.type ?? 'fixed',
  }))

  const [{ data: prevReceipts }, breakdown] = await Promise.all([
    supabase
      .from('receipts')
      .select('total_amount, status, billing_periods(name)')
      .eq('customer_id', receipt.customer_id ?? '')
      .neq('id', receipt.id)
      .order('created_at', { ascending: false })
      .limit(3),
    receiptService.calculateBreakdown(
      receipt.consumption_kwh ?? 0,
      sortedTiers,
      fixedConcepts,
      receipt.previous_debt ?? 0
    ),
  ])

  const previousReceiptRefs = (prevReceipts ?? []).map(r => ({
    periodName: (r.billing_periods as { name: string } | null)?.name ?? '-',
    totalAmount: r.total_amount,
    status: r.status ?? 'pending',
  }))

  const printLayoutProps = {
    supplyNumber: receipt.customers?.supply_number ?? '',
    customerName: receipt.customers?.full_name ?? '',
    customerAddress: receipt.customers?.address ?? '',
    sectorName: receipt.customers?.sectors?.name ?? '',
    tariffName: receipt.customers?.tariffs?.name ?? 'BT5B-RESIDENCIAL',
    connectionType: receipt.customers?.tariffs?.connection_type ?? 'monofásico',
    tariffTiers: sortedTiers.map(t => ({
      min_kwh: t.min_kwh,
      max_kwh: t.max_kwh,
      price_per_kwh: t.price_per_kwh,
      order_index: t.order_index,
    })),
    currentReading: receipt.current_reading,
    previousReading: receipt.previous_reading,
    consumptionKwh: receipt.consumption_kwh,
    readingDate: receipt.readings?.reading_date ?? receipt.period_end,
    previousReadingDate: receipt.period_start,
    periodName: receipt.billing_periods?.name ?? '',
    periodStart: receipt.period_start,
    periodEnd: receipt.period_end,
    energyAmount: receipt.energy_amount,
    conceptsBreakdown: breakdown.conceptsBreakdown,
    subtotal: receipt.subtotal,
    previousDebt: receipt.previous_debt ?? 0,
    totalAmount: receipt.total_amount,
    issueDate: receipt.issue_date,
    dueDate: receipt.due_date,
    status: receipt.status,
    municipalityConfig: municipalityConfig ? {
      ruc: municipalityConfig.ruc,
      name: municipalityConfig.name,
      om_number: municipalityConfig.om_number,
      logo_url: municipalityConfig.logo_url,
    } : null,
    previousReceipts: previousReceiptRefs,
  }

  return (
    <StaggerReveal>
    <div className="flex items-center gap-4 no-print">
        <Button variant="ghost" size="icon" aria-label="Volver a recibos" nativeButton={false} render={<Link href="/admin/receipts"><ArrowLeft className="h-5 w-5" /></Link>} />
        <div className="flex-1">
          <h2 className="text-3xl font-heading font-bold tracking-tight">Recibo</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Emitido el {formatDate(receipt.issue_date)}</span>
          </div>
        </div>
        <StatusBadge status={receipt.status ?? 'pending'} type="receipt" className="text-lg px-4 py-1" />
      </div>

      <div id="receipt-printable" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Informacion del Suministro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Suministro</p>
              <p className="text-xl font-mono font-bold text-primary">{receipt.customers?.supply_number ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Titular</p>
              <p className="font-medium">{receipt.customers?.full_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Direccion</p>
              <p className="text-sm">{receipt.customers?.address ?? '-'}</p>
              <p className="text-xs text-muted-foreground">{receipt.customers?.sectors?.name ?? '-'}</p>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Tarifa</p>
              <p className="text-sm font-medium">{receipt.customers?.tariffs?.name ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Liquidacion del Periodo
            </CardTitle>
            <Badge variant="secondary">{receipt.billing_periods?.name ?? '-'}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4 bg-muted/50 p-4 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Lect. Anterior</p>
                  <p className="text-xl font-mono">{receipt.previous_reading}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Lect. Actual</p>
                  <p className="text-xl font-mono">{receipt.current_reading}</p>
                </div>
                <div className="text-center border-l border-muted-foreground/20">
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Consumo kWh</p>
                  <p className="text-xl font-mono font-bold text-primary">{receipt.consumption_kwh}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-muni-amber" /> Energia Activa</span>
                  <span className="font-medium">{formatCurrency(receipt.energy_amount)}</span>
                </div>
                {breakdown.conceptsBreakdown.map((c, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b">
                    <span className="pl-6">{c.name}</span>
                    <span className="font-medium">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2 border-b font-semibold bg-muted/20 px-2 rounded">
                  <span>Subtotal del Mes</span>
                  <span>{formatCurrency(receipt.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center py-2 text-destructive">
                  <span>Deuda de Meses Anteriores</span>
                  <span className="font-medium">{formatCurrency(receipt.previous_debt)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-4 bg-primary text-primary-foreground rounded-lg">
                <span className="text-lg font-bold">TOTAL A PAGAR</span>
                <span className="text-3xl font-black">{formatCurrency(receipt.total_amount)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6 bg-muted/10 no-print">
            <div className="text-sm text-muted-foreground">
              <p><strong>Fecha Vencimiento:</strong> {formatDate(receipt.due_date)}</p>
            </div>
            <ReceiptDetailActions receiptId={receipt.id} receiptStatus={receipt.status ?? 'pending'} />
          </CardFooter>
        </Card>
      </div>

      <div id="receipt-municipal-print" style={{ position: 'absolute', left: '-9999px', top: 0 }}>
    <ReceiptPrintLayout {...printLayoutProps} />
    </div>
    </StaggerReveal>
  )
}