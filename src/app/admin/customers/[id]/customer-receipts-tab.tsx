import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatusBadge } from '@/components/status-badge'
import type { ReceiptForCustomer } from '@/types/views'

type CustomerReceiptsTabProps = {
  receipts: ReceiptForCustomer[]
  customer: { id: string; full_name: string }
}

export function CustomerReceiptsTab({ receipts }: CustomerReceiptsTabProps) {
  const payableReceipts = receipts.filter((r: ReceiptForCustomer) => ['pending', 'partial', 'overdue'].includes(r.status ?? ''))

  const totalDebt = Math.round(payableReceipts.reduce((sum, r) => sum + Math.round((r.total_amount - (r.paid_amount || 0)) * 100) / 100, 0) * 100) / 100

  return (
    <>
      {payableReceipts.length > 0 && (
        <div className="flex items-center gap-4 mb-4 p-4 bg-muted/50 rounded-lg border">
          <div className="flex-1">
            <p className="text-sm font-medium">Deuda pendiente: <span className="text-destructive font-bold text-lg">{formatCurrency(totalDebt)}</span></p>
            <p className="text-xs text-muted-foreground">{payableReceipts.length} recibo(s) por cobrar</p>
          </div>
          <span className="text-xs text-muted-foreground">Cobros en modulo de Caja</span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>N° Recibo</TableHead>
            <TableHead>Periodo</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {receipts.length === 0 ? (
            <TableRow><TableCell colSpan={5} className="text-center">No hay registros</TableCell></TableRow>
          ) : (
            receipts.map((r: ReceiptForCustomer) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono">{r.receipt_number}</TableCell>
                <TableCell>{r.billing_periods?.name}</TableCell>
                <TableCell>{formatDate(r.due_date)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(r.total_amount)}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status ?? ''} type="receipt" />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}
