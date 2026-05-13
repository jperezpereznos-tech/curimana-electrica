'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, User, MapPin, AlertCircle, Receipt, Printer, FileText } from 'lucide-react'
import { searchCashierCustomerAction, getCustomerPaymentsAction } from './actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PaymentModal } from './payment-modal'
import { BatchPaymentModal } from './batch-payment-modal'
import { pdfService } from '@/services/pdf-service'
import type { CustomerWithRelations, ReceiptWithPeriod } from '@/types/views'

type Customer = CustomerWithRelations
type ReceiptItem = ReceiptWithPeriod

const statusLabel: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { text: 'Pendiente', variant: 'outline' },
  partial: { text: 'Parcial', variant: 'secondary' },
  overdue: { text: 'Vencido', variant: 'destructive' },
  paid: { text: 'Pagado', variant: 'default' },
  cancelled: { text: 'Anulado', variant: 'outline' },
}

export function CashierSearch({ closureId, municipalityConfig }: { closureId: string; municipalityConfig?: { ruc?: string; name?: string } | null }) {
  const [q, setQ] = useState('')
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [receipts, setReceipts] = useState<ReceiptItem[]>([])
  const [payments, setPayments] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const searchVersionRef = useRef(0)

  const handleSearch = useCallback(async () => {
    if (!q) return
    const version = ++searchVersionRef.current
    setLoading(true)
    setNotFound(false)

    const result = await searchCashierCustomerAction(q)
    if (version !== searchVersionRef.current) return

    if (result.success && result.data) {
      setCustomer(result.data.customer)
      setReceipts(result.data.receipts)

      getCustomerPaymentsAction(result.data.customer.id).then(p => {
        if (version === searchVersionRef.current && p.success) {
          setPayments((p.data as Record<string, unknown>[]) || [])
        }
      }).catch((e) => { console.error('Error fetching customer payments:', e) })
    } else if (result.success && !result.data) {
      setCustomer(null)
      setReceipts([])
      setPayments([])
      setNotFound(true)
    } else {
      setNotFound(true)
    }

    if (version === searchVersionRef.current) {
      setLoading(false)
    }
  }, [q])

  const totalDebt = useMemo(() => {
    const receiptDebt = Math.round(receipts.reduce((sum, r) => sum + Math.round((r.total_amount - (r.paid_amount || 0)) * 100) / 100, 0) * 100) / 100
    if (receiptDebt > 0) return receiptDebt
    const customerDebt = Math.round(((customer?.current_debt as number) || 0) * 100) / 100
    return customerDebt
  }, [receipts, customer?.current_debt])

  const handlePrintVoucher = useCallback((payment: Record<string, unknown>) => {
    const receiptData = payment.receipts as Record<string, unknown> | null
    const custData = receiptData?.customers as Record<string, unknown> | null
    const periodData = receiptData?.billing_periods as Record<string, unknown> | null
    const cashierData = payment.cashier as Record<string, unknown> | null

    pdfService.generatePaymentVoucherPdf({
      paymentId: payment.id as string,
      reference: (payment.reference as string) || '',
      paymentDate: (payment.payment_date as string) || '',
      amount: Math.round((payment.amount as number) * 100) / 100,
      receivedAmount: Math.round(((payment.received_amount as number) || 0) * 100) / 100,
      changeAmount: Math.round(((payment.change_amount as number) || 0) * 100) / 100,
      receiptNumber: (receiptData?.receipt_number as string | number) || '',
      receiptTotal: Math.round(((receiptData?.total_amount as number) || 0) * 100) / 100,
      receiptPaidAfter: Math.round(((receiptData?.paid_amount as number) || 0) * 100) / 100,
      receiptStatus: (receiptData?.status as string) || '',
      periodName: (periodData?.name as string) || '',
    customer: {
        supplyNumber: (custData?.supply_number as string) || customer?.supply_number || '',
        fullName: (custData?.full_name as string) || customer?.full_name || '',
        address: (custData?.address as string | null) ?? customer?.address ?? null,
        sectorName: ((custData?.sectors as Record<string, unknown> | null)?.name as string | null) ?? (customer?.sectors as { name: string } | null)?.name ?? null,
    },
      municipality_config: municipalityConfig,
      cashierName: (cashierData?.full_name as string) || null,
    })
  }, [customer, municipalityConfig])

  return (
    <div className="space-y-6">
      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="N° Suministro o N° Recibo"
            className="pl-10 text-lg h-12"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button size="lg" className="h-12 px-8" onClick={handleSearch} disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {notFound && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg max-w-xl">
          Suministro no encontrado
        </div>
      )}

      {customer && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {/* Info Cliente */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" /> Datos del Titular
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Suministro</p>
                <p className="text-xl font-mono font-bold text-primary">{customer.supply_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold">Nombre</p>
                <p className="font-medium">{customer.full_name}</p>
              </div>
              <div className="flex items-start gap-1">
                <MapPin className="h-3 w-3 mt-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{customer.address} - {(customer.sectors as { name: string } | null)?.name || 'Sin sector'}</p>
              </div>
              <div className="pt-4 border-t space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Recibos Pendientes</p>
                  <p className="text-lg font-bold">{receipts.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Deuda Total Exigible</p>
                  <p className="text-3xl font-black text-destructive">{formatCurrency(totalDebt)}</p>
                </div>
                {receipts.length > 1 && (
        <BatchPaymentModal
          receipts={receipts}
          customer={customer}
          closureId={closureId}
          totalDebt={totalDebt}
          onSuccess={handleSearch}
          municipalityConfig={municipalityConfig}
        />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recibos Pendientes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Receipt className="h-4 w-4" /> Recibos Pendientes de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No hay recibos pendientes para este suministro.</p>
                  {totalDebt > 0 && (
                    <p className="text-sm mt-2 text-destructive font-medium">
                      Deuda registrada: {formatCurrency(totalDebt)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {receipts.map((receipt) => {
                    const pending = Math.round((receipt.total_amount - (receipt.paid_amount || 0)) * 100) / 100
                    const st = statusLabel[receipt.status || 'pending'] || statusLabel.pending
                    return (
                      <div key={receipt.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold font-mono">RECIBO {receipt.receipt_number}</p>
                              <Badge variant={st.variant}>{st.text}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{receipt.billing_periods?.name ?? 'Periodo no disponible'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            {receipt.status === 'partial' && (
                              <p className="text-xs text-muted-foreground">
                                Pagado: {formatCurrency(receipt.paid_amount || 0)} / {formatCurrency(receipt.total_amount)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground uppercase">Pendiente</p>
                            <p className="text-xl font-bold">{formatCurrency(pending)}</p>
                          </div>
                <PaymentModal
                  receipt={receipt}
                  customer={customer}
                  closureId={closureId}
                  onSuccess={handleSearch}
                  municipalityConfig={municipalityConfig}
                />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
        </CardContent>
      </Card>

      {/* Historial de Pagos */}
      {payments.length > 0 && (
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Comprobantes de Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payments.map((p) => {
                const r = p.receipts as Record<string, unknown> | null
                const period = r?.billing_periods as Record<string, unknown> | null
                return (
                  <div key={p.id as string} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-semibold text-sm">Recibo {String(r?.receipt_number ?? '-')}</p>
                          <Badge variant="default" className="text-xs">Pagado</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {period?.name ? String(period.name) : 'Sin periodo'} &middot; {formatDate(p.payment_date as string)} &middot; Ref: {String(p.reference || '-')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(p.amount as number)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handlePrintVoucher(p)}
                      >
                        <Printer className="h-3.5 w-3.5" /> Imprimir
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )}
</div>
  )
}
