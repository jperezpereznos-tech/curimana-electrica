'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, Printer } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { pdfService } from '@/services/pdf-service'

export type VoucherPaymentData = {
  reference: string
  paymentDate: string
  amount: number
  receivedAmount: number
  changeAmount: number
  receiptNumber: string | number
  receiptTotal: number
  receiptPaidAfter: number
  receiptStatus: string
  periodName: string
}

export type VoucherCustomerData = {
  supplyNumber: string
  fullName: string
  address?: string | null
  sector?: string | null
  sectorName?: string | null
}

type PaymentVoucherDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  payment: VoucherPaymentData
  customer: VoucherCustomerData
  municipalityConfig?: { ruc?: string; name?: string } | null
  cashierName?: string | null
}

export function PaymentVoucherDialog({
  open, onOpenChange, payment, customer, municipalityConfig, cashierName,
}: PaymentVoucherDialogProps) {
  const handlePrint = () => {
    pdfService.generatePaymentVoucherPdf({
      paymentId: '',
      reference: payment.reference,
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      receivedAmount: payment.receivedAmount,
      changeAmount: payment.changeAmount,
      receiptNumber: payment.receiptNumber,
      receiptTotal: payment.receiptTotal,
      receiptPaidAfter: payment.receiptPaidAfter,
      receiptStatus: payment.receiptStatus,
      periodName: payment.periodName,
      customer,
      municipality_config: municipalityConfig,
      cashierName,
    })
  }

  const isPartial = payment.receiptStatus === 'partial'
  const remainingOnReceipt = payment.receiptTotal - payment.receiptPaidAfter

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-6 w-6" />
            Pago Registrado
          </DialogTitle>
          <DialogDescription>
            Ref: {payment.reference} — {formatDate(payment.paymentDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="bg-success/10 p-4 rounded-lg space-y-2 border border-success/20">
            <div className="flex justify-between font-bold text-lg">
              <span>Monto Pagado:</span>
              <span>{formatCurrency(payment.amount)}</span>
            </div>
            {payment.changeAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Vuelto:</span>
                <span>{formatCurrency(payment.changeAmount)}</span>
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Recibo:</span>
              <span className="font-mono font-bold">N° {payment.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Periodo:</span>
              <span>{payment.periodName}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Recibo:</span>
              <span>{formatCurrency(payment.receiptTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pagado Acumulado:</span>
              <span className="font-medium">{formatCurrency(payment.receiptPaidAfter)}</span>
            </div>
          </div>

          {isPartial && (
            <div className="flex justify-between items-center p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              <span className="font-medium">Saldo Pendiente:</span>
              <span className="text-xl font-black">{formatCurrency(remainingOnReceipt)}</span>
            </div>
          )}

          <Button
            className="w-full h-12 text-lg gap-2"
            onClick={handlePrint}
          >
            <Printer className="h-5 w-5" /> Imprimir Comprobante
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
