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
import { processBatchPaymentAction } from './actions'
import { Database } from '@/types/database'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ReceiptWithPeriod = Database['public']['Tables']['receipts']['Row'] & {
  billing_periods: {
    name: string
  } | null
}

type BatchPaymentModalProps = {
  receipts: ReceiptWithPeriod[]
  customer: Pick<Database['public']['Tables']['customers']['Row'], 'id' | 'full_name'>
  closureId: string
  totalDebt: number
  onSuccess: () => void
}

export function BatchPaymentModal({ receipts, customer, closureId, totalDebt, onSuccess }: BatchPaymentModalProps) {
  const [open, setOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash')
  const [received, setReceived] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submittingRef = useRef(false)

  const change = paymentMethod === 'cash' && Number(received) > totalDebt ? Number(received) - totalDebt : 0

  const handlePayment = async () => {
    if (submittingRef.current) return

    setError(null)
    if (paymentMethod !== 'cash' && !reference.trim()) {
      setError('Ingrese el número de referencia / operación')
      return
    }

    submittingRef.current = true
    setLoading(true)
    try {
      const payments = receipts.map(r => ({
        receiptId: r.id,
        amount: Math.round((r.total_amount - (r.paid_amount || 0)) * 100) / 100,
      }))

      await processBatchPaymentAction({
        payments,
        customerId: customer.id,
        cashClosureId: closureId,
        paymentMethod,
        receivedAmount: Number(received) || totalDebt,
        changeAmount: change,
        reference: reference.trim() || undefined,
      })

      setOpen(false)
      setReference('')
      setReceived('')
      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago')
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }

  return (
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
                <span>{formatCurrency(r.total_amount - (r.paid_amount || 0))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total a Pagar:</span>
              <span className="text-destructive">{formatCurrency(totalDebt)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val as 'cash' | 'transfer' | 'card')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <Label htmlFor="batch-received">Monto Recibido (Efectivo)</Label>
              <Input
                id="batch-received"
                type="number"
                placeholder="0.00"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
              {Number(received) > 0 && (
                <div className="flex justify-between items-center p-3 bg-success/10 text-success rounded-lg border border-success/20">
                  <span className="font-medium">Vuelto:</span>
                  <span className="text-2xl font-black">{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {paymentMethod !== 'cash' && (
            <div className="space-y-2">
              <Label htmlFor="batch-reference">N° Referencia / Operación</Label>
              <Input
                id="batch-reference"
                placeholder="Ej: OP-123456"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              className="w-full h-12 text-lg gap-2"
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? 'Procesando...' : (
                <><Wallet className="h-5 w-5" /> Confirmar Pago de {formatCurrency(totalDebt)}</>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
