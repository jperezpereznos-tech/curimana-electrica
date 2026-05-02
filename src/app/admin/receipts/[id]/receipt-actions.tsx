'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, XCircle } from 'lucide-react'
import { pdfService } from '@/services/pdf-service'
import { cancelReceiptAction } from '../actions'
import { useRouter } from 'next/navigation'

export function ReceiptDetailActions({ receipt }: { receipt: any }) {
  const router = useRouter()
  const [cancelError, setCancelError] = useState<string | null>(null)

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

  return (
    <div className="space-y-2">
      {cancelError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {cancelError}
        </div>
      )}
      <div className="flex gap-2">
      <Button variant="outline" className="gap-2" onClick={() => window.print()}>
        <Printer className="h-4 w-4" /> Imprimir
      </Button>
      <Button variant="outline" className="gap-2" onClick={handleDownload}>
        <Download className="h-4 w-4" /> Descargar PDF
      </Button>
      {receipt.status !== 'cancelled' && (
        <Button variant="destructive" className="gap-2" onClick={handleCancel}>
          <XCircle className="h-4 w-4" /> Anular Recibo
        </Button>
      )}
      </div>
    </div>
  )
}
