'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { adminGetActiveClosureAction, adminOpenClosureAction, adminProcessPaymentAction } from '@/app/admin/payments/actions'
import { PaymentModal } from '@/components/payments/payment-modal'
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

type ReceiptRowPaymentProps = {
  receipt: any
  onPaymentSuccess: () => void
}

export function ReceiptRowPayment({ receipt, onPaymentSuccess }: ReceiptRowPaymentProps) {
const [closureId, setClosureId] = useState<string | null>(null)
const [checking, setChecking] = useState(false)
const [showOpenClosure, setShowOpenClosure] = useState(false)
const [openingAmount, setOpeningAmount] = useState('0')
const [opening, setOpening] = useState(false)
const [openError, setOpenError] = useState<string | null>(null)

const isPayable = ['pending', 'partial', 'overdue'].includes(receipt.status)

const handleClick = useCallback(async () => {
  if (!isPayable) return
  setChecking(true)
  try {
    const closure = await adminGetActiveClosureAction()
    if (closure) {
      setClosureId(closure.id)
    } else {
      setShowOpenClosure(true)
    }
  } catch {
    setShowOpenClosure(true)
  } finally {
    setChecking(false)
  }
}, [isPayable])

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

if (!isPayable) return null

return (
  <>
    {closureId ? (
      <PaymentModal
        receipt={receipt}
        customer={{ id: receipt.customer_id }}
        closureId={closureId}
        onSuccess={onPaymentSuccess}
        onProcessPayment={adminProcessPaymentAction}
      />
    ) : (
      <Button variant="outline" size="icon" onClick={handleClick} disabled={checking} title="Cobrar recibo">
        <Wallet className="h-4 w-4" />
      </Button>
    )}

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
