import { AdminLayout } from '@/components/layouts/admin-layout'
import { getReceiptService } from '@/services/receipt-service'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download, 
  Printer, 
  XCircle, 
  ArrowLeft, 
  User, 
  Calendar,
  Zap
} from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { notFound } from 'next/navigation'
import { ReceiptDetailActions } from './receipt-actions'

export default async function ReceiptDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const receiptService = getReceiptService(supabase)
  const receipt = await receiptService.getReceiptDetails(id)

  if (!receipt) {
    return notFound()
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/admin/receipts"><ArrowLeft className="h-5 w-5" /></Link>} />
          <div className="flex-1">
            <h2 className="text-3xl font-bold tracking-tight">Recibo N° {receipt.receipt_number}</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Emitido el {formatDate(receipt.issue_date)}</span>
            </div>
          </div>
          <Badge className="text-lg px-4 py-1" variant={receipt.status === 'paid' ? 'default' : 'outline'}>
            {(receipt.status ?? 'pending').toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Información del Cliente */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Información del Suministro
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
                <p className="text-xs text-muted-foreground uppercase font-semibold">Dirección</p>
                <p className="text-sm">{receipt.customers?.address ?? '-'}</p>
                <p className="text-xs text-muted-foreground">{receipt.customers?.sector ?? '-'}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground uppercase font-semibold">Tarifa</p>
                <p className="text-sm font-medium">{receipt.customers?.tariffs?.name ?? '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Desglose Económico */}
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Liquidación del Periodo
              </CardTitle>
              <Badge variant="secondary">{receipt.billing_periods?.name ?? '-'}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Lecturas */}
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

                {/* Tabla de Cargos */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Energía Activa</span>
                    <span className="font-medium">{formatCurrency(receipt.energy_amount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span>Cargos Fijos y Otros Conceptos</span>
                    <span className="font-medium">{formatCurrency(receipt.fixed_charges)}</span>
                  </div>
            <div className="flex justify-between items-center py-2 border-b font-semibold bg-muted/20 px-2 rounded">
              <span>Subtotal del Mes</span>
              <span>{formatCurrency(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span>IGV (18%)</span>
              <span className="font-medium">{formatCurrency(receipt.igv || 0)}</span>
            </div>
            <div className="flex justify-between items-center py-2 text-destructive">
              <span>Deuda de Meses Anteriores</span>
              <span className="font-medium">{formatCurrency(receipt.previous_debt)}</span>
            </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-4 bg-primary text-primary-foreground rounded-lg">
                  <span className="text-lg font-bold">TOTAL A PAGAR</span>
                  <span className="text-3xl font-black">{formatCurrency(receipt.total_amount)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6 bg-muted/10">
              <div className="text-sm text-muted-foreground">
                <p><strong>Fecha Vencimiento:</strong> {formatDate(receipt.due_date)}</p>
              </div>
              <ReceiptDetailActions receipt={receipt} />
            </CardFooter>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
