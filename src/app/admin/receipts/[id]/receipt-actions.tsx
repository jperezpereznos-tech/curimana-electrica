'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, XCircle } from 'lucide-react'
import { cancelReceiptAction } from '../actions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { ReceiptWithFullDetails } from '@/types/views'
import type { Database } from '@/types/database'

type MunicipalityConfig = Database['public']['Tables']['municipality_config']['Row']

interface ConceptBreakdownItem {
  name: string
  amount: number
}

export function ReceiptDetailActions({ receipt, municipalityConfig, conceptsBreakdown }: { receipt: ReceiptWithFullDetails; municipalityConfig?: MunicipalityConfig | null; conceptsBreakdown?: ConceptBreakdownItem[] }) {
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleCancel = async () => {
    setCancelError(null)
    const result = await cancelReceiptAction(receipt.id, 'Anulación administrativa')
    if (result.success) {
      setShowCancelConfirm(false)
    } else {
      setCancelError(result.error || 'Error al anular el recibo')
    }
  }

  return (
    <div className="space-y-2">
      {cancelError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {cancelError}
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
        </Button>

        {receipt.status !== 'cancelled' && (
          <Button variant="destructive" className="gap-2" onClick={() => setShowCancelConfirm(true)}>
            <XCircle className="h-4 w-4" /> Anular Recibo
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        title="Anular Recibo"
        description="¿Estás seguro de anular este recibo? Esta acción es irreversible."
        confirmLabel="Anular"
        destructive
        onConfirm={handleCancel}
      />
    </div>
  )
}
