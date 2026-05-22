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
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      
      const printElement = document.getElementById('receipt-municipal-print')
      if (!printElement) throw new Error('Elemento de impresión no encontrado')

      // Mover temporalmente al viewport para que html2canvas pueda capturarlo bien
      const originalStyle = printElement.getAttribute('style')
      printElement.setAttribute('style', 'position: absolute; top: 0; left: 0; width: 800px; background: white; z-index: -1;')

      const canvas = await html2canvas(printElement, {
        scale: 2, // Mejor resolución
        useCORS: true,
      })

      // Restaurar estilo original (fuera del viewport)
      if (originalStyle) {
        printElement.setAttribute('style', originalStyle)
      } else {
        printElement.removeAttribute('style')
      }

      const imgData = canvas.toDataURL('image/png')
      
      // Formato A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      
      const supply = receipt.customers?.supply_number || 'desconocido'
      const period = receipt.billing_periods?.name || 'periodo'
      const fileName = `recibo_${supply}_${period}.pdf`.replace(/\s+/g, '_')
      
      pdf.save(fileName)
    } catch (error) {
      console.error('Error al generar PDF:', error)
      setCancelError('Error al generar el archivo PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

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
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleDownload} disabled={isDownloading}>
          <Download className={`h-4 w-4 ${isDownloading ? 'animate-pulse' : ''}`} /> 
          {isDownloading ? 'Generando...' : 'Descargar PDF'}
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
