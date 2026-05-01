'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export function PaymentsList({ initialPayments, currentFilters }: any) {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState(currentFilters.from || '')
  const [dateTo, setDateTo] = useState(currentFilters.to || '')

  const updateFilters = (newFilters: any) => {
    const params = new URLSearchParams()
    Object.entries({ ...currentFilters, ...newFilters }).forEach(([key, value]) => {
      if (value) params.set(key, value as string)
      else params.delete(key)
    })
    router.push(`/admin/payments?${params.toString()}`)
  }

  const totalAmount = (initialPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  const handleExport = () => {
    const headers = ['Recibo', 'Cliente', 'Suministro', 'Monto', 'Fecha', 'Cajero', 'Referencia']
    const rows = (initialPayments || []).map((p: any) => [
      p.receipts?.receipt_number || '',
      p.receipts?.customers?.full_name || '',
      p.receipts?.customers?.supply_number || '',
      p.amount?.toString() || '0',
      formatDate(p.payment_date),
      (p.cashier as any)?.full_name || '',
      p.reference || '',
    ])

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.map((c: string) => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pagos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-lg border">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Desde</span>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase">Hasta</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={() => updateFilters({ from: dateFrom, to: dateTo })}>Filtrar</Button>
        <Button variant="outline" onClick={() => updateFilters({ from: '', to: '' })}>Limpiar</Button>
        <div className="ml-auto">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Total cobrado: <span className="font-bold text-foreground">{formatCurrency(totalAmount)}</span> — {(initialPayments || []).length} pagos
        </p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recibo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Suministro</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cajero</TableHead>
              <TableHead>Referencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(initialPayments || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron pagos.
                </TableCell>
              </TableRow>
            ) : (
              (initialPayments || []).map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.receipts?.receipt_number || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{payment.receipts?.customers?.full_name || 'Desconocido'}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.receipts?.customers?.supply_number || 'N/A'}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{(payment.cashier as any)?.full_name || 'N/A'}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.reference}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
