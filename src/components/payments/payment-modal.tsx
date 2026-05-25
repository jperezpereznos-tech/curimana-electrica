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
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'full_name' | 'supply_number' | 'address'> & { sectors?: { name: string } | null }
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
  }) => Promise<{ success: boolean; data?: unknown; error?: string }>
  onGetVoucherData?: (paymentId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
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
    sectorName: (customer.sectors as { name: string } | null)?.name ?? null,
  })

  const handlePayment = async () => {
    if (submittingRef.current) return

    setError(null)
    if (!amountToPay || amountToPay < 0.005) {
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

    const paymentResult = await onProcessPayment({
      receiptId: receipt.id,
      customerId: customer.id,
      cashClosureId: closureId,
      amount: rounded,
      paymentMethod: 'cash',
      receivedAmount: receivedNum || rounded,
      changeAmount: Math.max(0, change),
    })

    if (!paymentResult.success) {
      setError(paymentResult.error || 'Error al procesar el pago')
      setLoading(false)
      submittingRef.current = false
      return
    }

    setOpen(false)
    setReceived('')

    const paymentData = paymentResult.data as Record<string, unknown> | null | undefined
    const paymentId = paymentData?.id as string | undefined
    let voucherRef = ''
    let voucherDate = new Date().toISOString()
    let voucherReceiptPaidAfter = Math.round(((receipt.paid_amount || 0) + rounded) * 100) / 100
    let voucherReceiptStatus = isFullPayment ? 'paid' : 'partial'

    if (paymentId && onGetVoucherData) {
      const detailsResult = await onGetVoucherData(paymentId)
      if (detailsResult.success && detailsResult.data) {
        const details = detailsResult.data as Record<string, unknown>
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
                sectorName: ((custData.sectors as Record<string, unknown> | null)?.name as string | null) ?? (customer.sectors as { name: string } | null)?.name ?? null,
              })
        }
      }
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
    setLoading(false)
    submittingRef.current = false
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
              <p className={`text-xs font-medium ${isFullPayment ? 'text-success' : 'text-muni-amber'}`}>
                {isFullPayment ? 'Pago completo del recibo' : `Pago parcial — quedará un saldo de ${formatCurrency(Math.round((remaining - amountToPay) * 100) / 100)}`}
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
                <span className="text-xl font-black">{formatCurrency(Math.round((amountToPay - receivedNum) * 100) / 100)}</span>
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
