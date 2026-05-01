'use client'

import { useState } from 'react'
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
import { CreditCard, Wallet } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { paymentService } from '@/services/payment-service'
import { Database } from '@/types/database'

type ReceiptWithPeriod = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: {
    name: string
  } | null
}

type PaymentModalProps = {
  receipt: ReceiptWithPeriod
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id'>
  closureId: string
  onSuccess: () => void
}

export function PaymentModal({ receipt, customer, closureId, onSuccess }: PaymentModalProps) {
  const [open, setOpen] = useState(false)
  const [amountToPay, setAmountToPay] = useState(receipt.total_amount - (receipt.paid_amount || 0))
  const [received, setReceived] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = receipt.total_amount - (receipt.paid_amount || 0)
  const change = Number(received) > amountToPay ? Number(received) - amountToPay : 0

  const handlePayment = async () => {
    setError(null)
    if (!amountToPay || amountToPay <= 0) {
      setError('El monto debe ser mayor a cero')
      return
    }
    if (amountToPay > remaining) {
      setError('El monto excede el saldo pendiente')
      return
    }

    setLoading(true)
    try {
      await paymentService.processPayment({
        receiptId: receipt.id,
        customerId: customer.id,
        cashClosureId: closureId,
        amount: amountToPay,
        paymentMethod: 'cash',
        receivedAmount: Number(received) || amountToPay,
        changeAmount: change
      })
      
      setOpen(false)
      onSuccess()
    } catch {
      setError('Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="gap-2">
          <CreditCard className="h-4 w-4" /> Cobrar
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
            <Input 
              id="amount" 
              type="number" 
              className="text-2xl font-bold"
              value={amountToPay}
              onChange={(e) => setAmountToPay(Number(e.target.value))}
            />
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

          {Number(received) > 0 && (
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
            disabled={loading || !amountToPay}
          >
            {loading ? 'Procesando...' : (
              <><Wallet className="h-5 w-5" /> Confirmar Pago de {formatCurrency(amountToPay)}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
