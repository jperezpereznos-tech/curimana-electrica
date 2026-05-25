import { getPaymentService } from '@/services/payment-service'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, DollarSign, User, FileText, Calendar } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const paymentService = getPaymentService(supabase)

  let payment
  try {
    payment = await paymentService.getPaymentDetails(id)
  } catch {
    return notFound()
  }

  if (!payment) {
    return notFound()
  }

  const receipt = payment.receipts
  const customer = receipt?.customers
  const cashier = payment.cashier

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" aria-label="Volver a pagos" nativeButton={false} render={<Link href="/admin/payments"><ArrowLeft className="h-5 w-5" /></Link>} />
        <div className="flex-1">
          <h2 className="text-3xl font-heading font-bold tracking-tight">Detalle de Pago</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span suppressHydrationWarning>{formatDate(payment.payment_date, { includeTime: true })}</span>
          </div>
        </div>
      <StatusBadge status={payment.status ?? 'completed'} type="payment" className="text-lg px-4 py-1" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Informacion del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Suministro</p>
              <p className="text-xl font-mono font-bold text-primary">{customer?.supply_number ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Titular</p>
              <p className="font-medium">{customer?.full_name ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Direccion</p>
              <p className="text-sm">{customer?.address ?? '-'}</p>
              <p className="text-xs text-muted-foreground">{(customer as Record<string, unknown> & { sectors?: { name: string } | null })?.sectors?.name ?? '-'}</p>
            </div>
            {cashier && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Cajero</p>
                <p className="text-sm font-medium">{cashier.full_name ?? '-'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Detalle del Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Recibo N°</p>
                <p className="text-lg font-mono">{receipt?.receipt_number ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase">Periodo</p>
                <p className="text-sm">{receipt?.billing_periods?.name ?? '-'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Estado del Recibo</span>
                <Badge variant={receipt?.status === 'paid' ? 'default' : 'outline'}>
                  {(receipt?.status ?? 'pending').toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Total del Recibo</span>
                <span className="font-medium">{formatCurrency(receipt?.total_amount ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span>Monto Pagado (acumulado)</span>
                <span className="font-medium">{formatCurrency(receipt?.paid_amount ?? 0)}</span>
              </div>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /> Monto de este Pago</span>
                <span className={`text-2xl font-black ${payment.status === 'voided' ? 'line-through text-destructive' : 'text-primary'}`}>{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Metodo</span>
                <span className="font-medium">Efectivo</span>
              </div>
              {payment.received_amount != null && (
                <div className="flex justify-between items-center text-sm">
                  <span>Recibido</span>
                  <span className="font-medium">{formatCurrency(payment.received_amount)}</span>
                </div>
              )}
                {payment.change_amount != null && payment.change_amount > 0.005 && (
                <div className="flex justify-between items-center text-sm">
                  <span>Vuelto</span>
                  <span className="font-medium">{formatCurrency(payment.change_amount)}</span>
                </div>
              )}
              {payment.reference && (
                <div className="flex justify-between items-center text-sm">
                  <span>Referencia</span>
                  <span className="font-mono text-xs">{payment.reference}</span>
                </div>
              )}
            </div>

            {payment.status === 'voided' && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                Este pago ha sido anulado. El monto fue revertido al recibo y la deuda del cliente.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
