'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { FileDown, Loader2 } from 'lucide-react'
import { downloadCSV } from '@/lib/report-utils'
import { getCustomersWithDebtAction, getPaidReceiptsAction } from './actions'

export function DownloadReports() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const downloadMorosos = async () => {
    setLoading(true)
    setError(null)
    try {
      const customers = await getCustomersWithDebtAction()
      const filtered = customers
        .filter(c => (c.current_debt ?? 0) > 0)
        .map(c => ({
          Suministro: c.supply_number,
          Nombre: c.full_name,
          Direccion: c.address,
          Sector: c.sector,
          Deuda: c.current_debt
        }))
      downloadCSV(filtered, `morosos_${new Date().toISOString().split('T')[0]}`)
    } catch {
      setError('Error al generar reporte de morosos')
    } finally {
      setLoading(false)
    }
  }

  const downloadRecaudacion = async () => {
    setLoading(true)
    setError(null)
    try {
      const receipts = await getPaidReceiptsAction()
      const data = (receipts || []).map((r: any) => ({
        Recibo: r.receipt_number,
        Suministro: r.customers?.supply_number,
        Cliente: r.customers?.full_name,
        Monto: r.total_amount,
        Fecha_Pago: r.updated_at
      }))
      downloadCSV(data, `recaudacion_${new Date().toISOString().split('T')[0]}`)
    } catch {
      setError('Error al generar reporte de recaudación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}
      <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" className="gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Exportar Reportes
        </Button>
      } />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={downloadMorosos}>
          Lista de Morosos (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadRecaudacion}>
          Recaudación por Periodo (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
