'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wallet } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PaymentModal } from '@/components/payments/payment-modal'
import { BatchPaymentModal } from '@/components/payments/batch-payment-modal'
import {
  adminGetActiveClosureAction,
  adminOpenClosureAction,
  adminProcessPaymentAction,
  adminProcessBatchPaymentAction,
} from '@/app/admin/payments/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Database } from '@/types/database'

type ReceiptWithPeriod = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: { name: string } | null
}

const statusConfig: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { text: 'Pendiente', variant: 'outline' },
  partial: { text: 'Parcial', variant: 'secondary' },
  overdue: { text: 'Vencido', variant: 'destructive' },
  paid: { text: 'Pagado', variant: 'default' },
  cancelled: { text: 'Anulado', variant: 'outline' },
}

type CustomerReceiptsTabProps = {
  receipts: any[]
  customer: { id: string; full_name: string }
  onRefresh: () => void
}

export function CustomerReceiptsTab({ receipts, customer, onRefresh }: CustomerReceiptsTabProps) {
  const [closureId, setClosureId] = useState<string | null>(null)
  const [showOpenClosure, setShowOpenClosure] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('0')
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const payableReceipts = useMemo(
    () => receipts.filter((r: any) => ['pending', 'partial', 'overdue'].includes(r.status)) as ReceiptWithPeriod[],
    [receipts]
  )

  const totalDebt = useMemo(
    () => payableReceipts.reduce((sum, r) => sum + (r.total_amount - (r.paid_amount || 0)), 0),
    [payableReceipts]
  )

  useEffect(() => {
    adminGetActiveClosureAction().then(c => {
      if (c) setClosureId(c.id)
    })
  }, [])

  const handleOpenClosure = async () => {
    setOpening(true)
    setOpenError(null)
    try {
      const closure = await adminOpenClosureAction(Number(openingAmount) || 0)
      setClosureId(closure.id)
      setShowOpenClosure(false)
    } catch (err: unknown) {
      setOpenError(err instanceof Error ? err.message : 'Error al abrir caja')
    } finally {
      setOpening(false)
    }
  }

  const handlePaymentSuccess = useCallback(() => {
    onRefresh()
  }, [onRefresh])

  return (
    <>
      {payableReceipts.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex-1">
            <p className="text-sm font-medium">Deuda pendiente: <span className="text-destructive font-bold text-lg">{formatCurrency(totalDebt)}</span></p>
            <p className="text-xs text-muted-foreground">{payableReceipts.length} recibo(s) por cobrar</p>
          </div>
          {!closureId ? (
            <Button className="gap-2" onClick={() => setShowOpenClosure(true)}>
              <Wallet className="h-4 w-4" /> Abrir Caja para Cobrar
            </Button>
          ) : payableReceipts.length > 1 ? (
            <BatchPaymentModal
              receipts={payableReceipts}
              customer={customer}
              closureId={closureId}
              totalDebt={totalDebt}
              onSuccess={handlePaymentSuccess}
              onProcessBatchPayment={adminProcessBatchPaymentAction}
            />
          ) : null}
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Recibo</TableHead>
            <TableHead>Periodo</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center">No hay registros</TableCell></TableRow>
          ) : (
            receipts.map((r: any) => {
              const st = statusConfig[r.status] || { text: r.status, variant: 'outline' as const }
              const isPayable = ['pending', 'partial', 'overdue'].includes(r.status)
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.receipt_number}</TableCell>
                  <TableCell>{r.billing_periods?.name}</TableCell>
                  <TableCell>{formatDate(r.due_date)}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(r.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.text}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isPayable && closureId ? (
                      <PaymentModal
                        receipt={r as ReceiptWithPeriod}
                        customer={{ id: customer.id }}
                        closureId={closureId}
                        onSuccess={handlePaymentSuccess}
                        onProcessPayment={adminProcessPaymentAction}
                      />
                    ) : isPayable && !closureId ? (
                      <Button variant="ghost" size="sm" onClick={() => setShowOpenClosure(true)} title="Abrir caja para cobrar">
                        <Wallet className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <Dialog open={showOpenClosure} onOpenChange={setShowOpenClosure}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>
              Necesitas una caja abierta para registrar cobros. Ingresa el monto inicial.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {openError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {openError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="opening-amount">Monto Inicial (S/)</Label>
              <Input
                id="opening-amount"
                type="number"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleOpenClosure} disabled={opening}>
              {opening ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
