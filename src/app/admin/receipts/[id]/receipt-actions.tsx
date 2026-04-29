'use client'

import { Button } from '@/components/ui/button'
import { Download, Printer, XCircle } from 'lucide-react'
import { pdfService } from '@/services/pdf-service'
import { receiptService } from '@/services/receipt-service'
import { useRouter } from 'next/navigation'

export function ReceiptDetailActions({ receipt }: { receipt: any }) {
  const router = useRouter()

  const handleDownload = () => {
    pdfService.generateReceiptPdf(receipt)
  }

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de anular este recibo? Esta acción es irreversible.')) {
      return
    }

    try {
      await receiptService.cancelReceipt(receipt.id, 'Anulación administrativa')
      router.refresh()
    } catch (error) {
      alert('Error al anular el recibo')
    }
  }

  return (
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
  )
}
