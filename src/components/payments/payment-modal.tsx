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

type PaymentModalProps = {
  receipt: ReceiptWithPeriod
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'full_name' | 'supply_number' | 'address' | 'sector'>
  closureId: string
  onSuccess: () => void
  onProcessPayment: (data: {
    receiptId: string
    customerId: string
    cashClosureId: string
    amount: number
    paymentMethod: 'cash'
    receivedAmount: number
    changeAmount: number
  }) => Promise<unknown>
  onGetVoucherData?: (paymentId: string) => Promise<Record<string, unknown> | null>
  municipalityConfig?: { ruc?: string; name?: string } | null
}

export function PaymentModal({ receipt, customer, closureId, onSuccess, onProcessPayment, onGetVoucherData, municipalityConfig }: PaymentModalProps) {
  const [open, setOpen] = useState(false)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const [voucherPayment, setVoucherPayment] = useState<VoucherPaymentData | null>(null)
  const remaining = Math.round((receipt.total_amount - (receipt.paid_amount || 0)) * 100) / 100
  const [amountToPay, setAmountToPay] = useState(remaining)
  const [received, setReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const isFullPayment = Math.abs(amountToPay - remaining) < 0.01
  const receivedNum = Number(received)
  const change = Math.round((receivedNum - amountToPay) * 100) / 100
  const receivedIsEnough = Math.round((receivedNum - amountToPay) * 100) / 100 >= 0

  const [voucherCustomer, setVoucherCustomer] = useState<VoucherCustomerData>({
    supplyNumber: customer.supply_number || '',
    fullName: customer.full_name || '',
    address: customer.address,
    sector: customer.sector,
  })

  const handlePayment = async () => {
    if (submittingRef.current) return

    setError(null)
    if (!amountToPay || amountToPay <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    const rounded = Math.round(amountToPay * 100) / 100
    if (rounded - remaining > 0.005) {
      setError('El monto excede el saldo pendiente')
      return
    }
    if (!received && rounded < remaining) {
      setError('Ingresa el monto recibido en efectivo')
      return
    }
    if (received && !receivedIsEnough) {
      setError('El monto recibido debe ser mayor o igual al monto a cobrar')
      return
    }

    submittingRef.current = true
    setLoading(true)
    try {
      const paymentResult = await onProcessPayment({
        receiptId: receipt.id,
        customerId: customer.id,
        cashClosureId: closureId,
        amount: rounded,
        paymentMethod: 'cash',
        receivedAmount: receivedNum || rounded,
        changeAmount: change,
      }) as Record<string, unknown> | null

      setOpen(false)
      setReceived('')

      const paymentId = paymentResult?.id as string | undefined
      let voucherRef = ''
      let voucherDate = new Date().toISOString()
      let voucherReceiptPaidAfter = Math.round(((receipt.paid_amount || 0) + rounded) * 100) / 100
      let voucherReceiptStatus = isFullPayment ? 'paid' : 'partial'

      if (paymentId && onGetVoucherData) {
        try {
          const details = await onGetVoucherData(paymentId)
          if (details) {
            voucherRef = (details.reference as string) || voucherRef
            voucherDate = (details.payment_date as string) || voucherDate
            const receiptData = details.receipts as Record<string, unknown> | null
            if (receiptData) {
              voucherReceiptPaidAfter = Math.round(((receiptData.paid_amount as number) || 0) * 100) / 100
              voucherReceiptStatus = (receiptData.status as string) || voucherReceiptStatus
            }
            const custData = receiptData?.customers as Record<string, unknown> | null
            if (custData) {
              setVoucherCustomer({
                supplyNumber: (custData.supply_number as string) || customer.supply_number || '',
                fullName: (custData.full_name as string) || customer.full_name || '',
                address: custData.address as string | null ?? customer.address,
                sector: custData.sector as string | null ?? customer.sector,
              })
            }
          }
        } catch { /* use defaults */ }
      }

      setVoucherPayment({
        reference: voucherRef || `PAY-${Date.now()}`,
        paymentDate: voucherDate,
        amount: rounded,
        receivedAmount: receivedNum || rounded,
        changeAmount: Math.max(0, change),
        receiptNumber: receipt.receipt_number,
        receiptTotal: Math.round(receipt.total_amount * 100) / 100,
        receiptPaidAfter: voucherReceiptPaidAfter,
        receiptStatus: voucherReceiptStatus,
        periodName: receipt.billing_periods?.name || '',
      })
      setVoucherOpen(true)

      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={
          <Button variant="outline" size="sm">
            Registrar Pago
          </Button>
        } />
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              Recibo {receipt.receipt_number} - {receipt.billing_periods?.name ?? 'Periodo no disponible'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Recibo:</span>
                <span>{formatCurrency(receipt.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pagado anteriormente:</span>
                <span>{formatCurrency(receipt.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Saldo Pendiente:</span>
                <span className="text-destructive">{formatCurrency(remaining)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto a Cobrar (S/)</Label>
              <Input id="amount" type="number" className="text-2xl font-bold" value={amountToPay} onChange={(e) => setAmountToPay(Number(e.target.value))} />
              <p className={`text-xs font-medium ${isFullPayment ? 'text-success' : 'text-amber-600'}`}>
                {isFullPayment ? 'Pago completo del recibo' : `Pago parcial — quedará un saldo de ${formatCurrency(remaining - amountToPay)}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="received">Monto Recibido (Efectivo)</Label>
              <Input
                id="received"
                type="number"
                placeholder="0.00"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
            </div>

            {receivedNum > 0 && !receivedIsEnough && (
              <div className="flex justify-between items-center p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <span className="font-medium">Falta:</span>
                <span className="text-xl font-black">{formatCurrency(amountToPay - receivedNum)}</span>
              </div>
            )}

            {receivedNum > 0 && receivedIsEnough && (
              <div className="flex justify-between items-center p-3 bg-success/10 text-success rounded-lg border border-success/20">
                <span className="font-medium">Vuelto:</span>
                <span className="text-2xl font-black">{formatCurrency(change)}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                className="w-full h-12 text-lg gap-2"
                onClick={handlePayment}
                disabled={loading || !amountToPay || (receivedNum > 0 && !receivedIsEnough)}
              >
                {loading ? 'Procesando...' : (
                  <><Wallet className="h-5 w-5" /> Confirmar Pago de {formatCurrency(amountToPay)}</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {voucherPayment && <PaymentVoucherDialog
          open={voucherOpen}
          onOpenChange={setVoucherOpen}
          payment={voucherPayment}
          customer={voucherCustomer}
          municipalityConfig={municipalityConfig}
      />}
    </>
  )
}
