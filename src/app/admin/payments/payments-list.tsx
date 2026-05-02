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
import { Badge } from '@/components/ui/badge'
import { Download, Ban, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { voidPaymentAction } from './actions'

const PAGE_SIZE = 25

export function PaymentsList({ initialPayments, currentFilters }: any) {
  const router = useRouter()
  const [dateFrom, setDateFrom] = useState(currentFilters.from || '')
  const [dateTo, setDateTo] = useState(currentFilters.to || '')
  const [voidError, setVoidError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil((initialPayments || []).length / PAGE_SIZE))
  const paginated = (initialPayments || []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const updateFilters = (newFilters: any) => {
    const params = new URLSearchParams()
    Object.entries({ ...currentFilters, ...newFilters }).forEach(([key, value]) => {
      if (value) params.set(key, value as string)
      else params.delete(key)
    })
    router.push(`/admin/payments?${params.toString()}`)
  }

  const totalAmount = (initialPayments || [])
    .filter((p: any) => p.status !== 'voided')
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

  const handleVoid = async (paymentId: string) => {
    if (!confirm('¿Estás seguro de anular este pago? Se revertirá el monto en el recibo y la deuda del cliente.')) return
    setVoidError(null)
    try {
      await voidPaymentAction(paymentId)
      router.refresh()
    } catch {
      setVoidError('Error al anular el pago.')
    }
  }

  const handleExport = () => {
    const headers = ['Recibo', 'Cliente', 'Suministro', 'Monto', 'Fecha', 'Cajero', 'Referencia', 'Estado']
    const rows = (initialPayments || []).map((p: any) => [
      p.receipts?.receipt_number || '',
      p.receipts?.customers?.full_name || '',
      p.receipts?.customers?.supply_number || '',
      p.amount?.toString() || '0',
      formatDate(p.payment_date),
      (p.cashier as any)?.full_name || '',
      p.reference || '',
      p.status || 'completed',
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
      {voidError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{voidError}</div>
      )}
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
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(initialPayments || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron pagos.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((payment: any) => (
                <TableRow key={payment.id} className={payment.status === 'voided' ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-xs">{payment.receipts?.receipt_number || 'N/A'}</TableCell>
                  <TableCell className="font-medium">{payment.receipts?.customers?.full_name || 'Desconocido'}</TableCell>
                  <TableCell className="font-mono text-xs">{payment.receipts?.customers?.supply_number || 'N/A'}</TableCell>
                  <TableCell className={payment.status === 'voided' ? 'line-through' : 'font-bold'}>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{(payment.cashier as any)?.full_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={payment.status === 'voided' ? 'destructive' : 'default'}>
                      {payment.status === 'voided' ? 'Anulado' : 'Completado'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status !== 'voided' && (
                      <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => handleVoid(payment.id)}>
                        <Ban className="h-3 w-3" /> Anular
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4 border-t">
            <p className="text-sm text-muted-foreground">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, (initialPayments || []).length)} de {(initialPayments || []).length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
