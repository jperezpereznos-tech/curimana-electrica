'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Database } from '@/types/database'
import { PaymentVoucherDialog, type VoucherPaymentData, type VoucherCustomerData } from './payment-voucher-dialog'

type ReceiptWithPeriod = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: {
    name: string
  } | null
}

type BatchPaymentModalProps = {
  receipts: ReceiptWithPeriod[]
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'full_name' | 'supply_number' | 'address'> & { sectors?: { name: string } | null }
  closureId: string
  totalDebt: number
  onSuccess: () => void
  onProcessBatchPayment: (data: {
    payments: { receiptId: string; amount: number }[]
    customerId: string
    cashClosureId: string
    paymentMethod: 'cash'
    receivedAmount?: number
    changeAmount?: number
  }) => Promise<{ success: boolean; data?: unknown; error?: string }>
  municipalityConfig?: { ruc?: string; name?: string } | null
}

export function BatchPaymentModal({ receipts, customer, closureId, totalDebt, onSuccess, onProcessBatchPayment, municipalityConfig }: BatchPaymentModalProps) {
  const [open, setOpen] = useState(false)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherPayment, setVoucherPayment] = useState<VoucherPaymentData | null>(null)
  const [received, setReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const change = Math.round((Number(received) - totalDebt) * 100) / 100
  const receivedIsEnough = !received || Number(received) >= totalDebt

  const voucherCustomer: VoucherCustomerData = {
    supplyNumber: customer.supply_number || '',
    fullName: customer.full_name || '',
    address: customer.address,
    sectorName: (customer.sectors as { name: string } | null)?.name ?? null,
  }

  const handlePayment = async () => {
    if (submittingRef.current) return

    setError(null)
    if (received && !receivedIsEnough) {
      setError('El monto recibido debe ser mayor o igual a la deuda total')
      return
    }

    submittingRef.current = true
    setLoading(true)

    const payments = receipts.map(r => ({
      receiptId: r.id,
      amount: Math.round((r.total_amount - (r.paid_amount || 0)) * 100) / 100,
    }))

    const result = await onProcessBatchPayment({
      payments,
      customerId: customer.id,
      cashClosureId: closureId,
      paymentMethod: 'cash',
      receivedAmount: Number(received) || totalDebt,
      changeAmount: Math.max(0, change),
    })

    if (!result.success) {
      setError(result.error || 'Error al procesar el pago')
      setLoading(false)
      submittingRef.current = false
      return
    }

    setOpen(false)
    setReceived('')

    setVoucherPayment({
      reference: 'LOTE-' + Date.now(),
      paymentDate: new Date().toISOString(),
      amount: totalDebt,
      receivedAmount: Number(received) || totalDebt,
      changeAmount: Math.max(0, change),
      receiptNumber: receipts.map(r => r.receipt_number).join(', '),
      receiptTotal: Math.round(receipts.reduce((s, r) => s + r.total_amount, 0) * 100) / 100,
      receiptPaidAfter: Math.round(receipts.reduce((s, r) => s + r.total_amount, 0) * 100) / 100,
      receiptStatus: 'paid',
      periodName: receipts.map(r => r.billing_periods?.name).filter(Boolean).join(', ') || 'Varios',
    })
    setVoucherOpen(true)

    onSuccess()
    setLoading(false)
    submittingRef.current = false
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={
          <Button className="w-full gap-2 mt-2">
            <Wallet className="h-4 w-4" /> Pagar Todo
          </Button>
        } />
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Pagar Deuda Completa</DialogTitle>
            <DialogDescription>
              {customer.full_name} — {receipts.length} recibo(s)
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              {receipts.map(r => (
                <div key={r.id} className="flex justify-between text-sm">
                  <span>Recibo {r.receipt_number}</span>
                  <span>{formatCurrency(Math.round((r.total_amount - (r.paid_amount || 0)) * 100) / 100)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total a Pagar:</span>
                <span className="text-destructive">{formatCurrency(totalDebt)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-received">Monto Recibido (Efectivo)</Label>
              <Input
                id="batch-received"
                type="number"
                placeholder="0.00"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
              {Number(received) > 0 && !receivedIsEnough && (
        <div className="flex justify-between items-center p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          <span className="font-medium">Falta:</span>
          <span className="text-xl font-black">{formatCurrency(Math.round((totalDebt - Number(received)) * 100) / 100)}</span>
        </div>
      )}
      {Number(received) > 0 && receivedIsEnough && (
                <div className="flex justify-between items-center p-3 bg-success/10 text-success rounded-lg border border-success/20">
                  <span className="font-medium">Vuelto:</span>
                  <span className="text-2xl font-black">{formatCurrency(change)}</span>
                </div>
              )}
            </div>

        <DialogFooter>
          <Button
            className="w-full h-12 text-lg gap-2"
            onClick={handlePayment}
            disabled={loading || !receivedIsEnough}
          >
                {loading ? 'Procesando...' : (
                  <><Wallet className="h-5 w-5" /> Confirmar Pago de {formatCurrency(totalDebt)}</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {voucherPayment && (
        <PaymentVoucherDialog
          open={voucherOpen}
          onOpenChange={setVoucherOpen}
          payment={voucherPayment}
          customer={voucherCustomer}
          municipalityConfig={municipalityConfig}
        />
      )}
    </>
  )
}
