'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, XCircle } from 'lucide-react'
import { pdfService } from '@/services/pdf-service'
import { cancelReceiptAction } from '../actions'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { ReceiptWithPeriod } from '@/types/views'

export function ReceiptDetailActions({ receipt }: { receipt: ReceiptWithPeriod }) {
 const router = useRouter()
 const [cancelError, setCancelError] = useState<string | null>(null)
 const [showCancelConfirm, setShowCancelConfirm] = useState(false)

 const handleDownload = () => {
 pdfService.generateReceiptPdf(receipt)
 }

 const handleCancel = async () => {
 setCancelError(null)
 try {
 await cancelReceiptAction(receipt.id, 'Anulación administrativa')
 setShowCancelConfirm(false)
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
 <div className="flex gap-2 flex-wrap">
 <Button variant="outline" className="gap-2" onClick={() => window.print()}>
 <Printer className="h-4 w-4" /> Imprimir
 </Button>
 <Button variant="outline" className="gap-2" onClick={handleDownload}>
 <Download className="h-4 w-4" /> Descargar PDF
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
