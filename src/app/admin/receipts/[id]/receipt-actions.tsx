'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, XCircle, Wallet } from 'lucide-react'
import { pdfService } from '@/services/pdf-service'
import { cancelReceiptAction } from '../actions'
import { adminGetActiveClosureAction, adminOpenClosureAction, adminProcessPaymentAction } from '@/app/admin/payments/actions'
import { PaymentModal } from '@/components/payments/payment-modal'
import { useRouter } from 'next/navigation'
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

export function ReceiptDetailActions({ receipt }: { receipt: any }) {
  const router = useRouter()
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [closureId, setClosureId] = useState<string | null>(null)
  const [showOpenClosure, setShowOpenClosure] = useState(false)
  const [openingAmount, setOpeningAmount] = useState('0')
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const isPayable = ['pending', 'partial', 'overdue'].includes(receipt.status)

  useEffect(() => {
    if (isPayable) {
      adminGetActiveClosureAction().then(c => {
        if (c) setClosureId(c.id)
      })
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

  const handleDownload = () => {
    pdfService.generateReceiptPdf(receipt)
  }

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de anular este recibo? Esta acción es irreversible.')) {
      return
    }

    setCancelError(null)
    try {
      await cancelReceiptAction(receipt.id, 'Anulación administrativa')
      router.refresh()
    } catch {
      setCancelError('Error al anular el recibo')
    }
  }

  const handlePaymentSuccess = () => {
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {cancelError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {cancelError}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleDownload}>
          <Download className="h-4 w-4" /> Descargar PDF
        </Button>

        {isPayable && !closureId && (
          <Button className="gap-2" onClick={() => setShowOpenClosure(true)}>
            <Wallet className="h-4 w-4" /> Abrir Caja y Cobrar
          </Button>
        )}

        {isPayable && closureId && (
          <PaymentModal
            receipt={receipt}
            customer={{ id: receipt.customer_id }}
            closureId={closureId}
            onSuccess={handlePaymentSuccess}
            onProcessPayment={adminProcessPaymentAction}
          />
        )}

        {receipt.status !== 'cancelled' && (
          <Button variant="destructive" className="gap-2" onClick={handleCancel}>
            <XCircle className="h-4 w-4" /> Anular Recibo
          </Button>
        )}
      </div>

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
    </div>
  )
}
