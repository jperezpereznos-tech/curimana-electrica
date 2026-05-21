'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Printer, XCircle } from 'lucide-react'
import { cancelReceiptAction } from '../actions'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { ReceiptWithFullDetails } from '@/types/views'
import type { Database } from '@/types/database'

type MunicipalityConfig = Database['public']['Tables']['municipality_config']['Row']

interface ConceptBreakdownItem {
  name: string
  amount: number
}

export function ReceiptDetailActions({ receipt, municipalityConfig, conceptsBreakdown }: { receipt: ReceiptWithFullDetails; municipalityConfig?: MunicipalityConfig | null; conceptsBreakdown?: ConceptBreakdownItem[] }) {
  const router = useRouter()
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const handleDownload = async () => {
    const { pdfService } = await import('@/services/pdf-service')
    pdfService.generateReceiptPdf({
      ...receipt,
      customers: receipt.customers ? {
        supply_number: receipt.customers.supply_number,
        full_name: receipt.customers.full_name,
        address: receipt.customers.address ?? undefined,
        sectors: receipt.customers.sectors ? { id: receipt.customers.sectors.id, name: receipt.customers.sectors.name } : null,
        tariffs: receipt.customers.tariffs ? { name: receipt.customers.tariffs.name, connection_type: receipt.customers.tariffs.connection_type } : null,
      } : null,
      tariff_tiers: receipt.customers?.tariffs?.tariff_tiers ?? [],
      readings: receipt.readings ? { reading_date: receipt.readings.reading_date } : null,
      municipality_config: municipalityConfig ? { ruc: municipalityConfig.ruc, name: municipalityConfig.name, om_number: municipalityConfig.om_number, logo_url: municipalityConfig.logo_url } : undefined,
      conceptsBreakdown,
    })
  }

  const handleCancel = async () => {
    setCancelError(null)
    const result = await cancelReceiptAction(receipt.id, 'Anulación administrativa')
    if (result.success) {
      setShowCancelConfirm(false)
      router.refresh()
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
