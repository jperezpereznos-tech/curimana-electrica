'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
 Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { ReceiptForCustomer } from '@/types/views'

const statusConfig: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
 pending: { text: 'Pendiente', variant: 'outline' },
 partial: { text: 'Parcial', variant: 'secondary' },
 overdue: { text: 'Vencido', variant: 'destructive' },
 paid: { text: 'Pagado', variant: 'default' },
 cancelled: { text: 'Anulado', variant: 'outline' },
}

type CustomerReceiptsTabProps = {
 receipts: ReceiptForCustomer[]
 customer: { id: string; full_name: string }
 onRefresh?: () => void
}

export function CustomerReceiptsTab({ receipts, customer: _customer }: CustomerReceiptsTabProps) {
 const payableReceipts = useMemo(
 () => receipts.filter((r: ReceiptForCustomer) => ['pending', 'partial', 'overdue'].includes(r.status ?? '')),
 [receipts]
 )

 const totalDebt = useMemo(
 () => payableReceipts.reduce((sum, r) => sum + (r.total_amount - (r.paid_amount || 0)), 0),
 [payableReceipts]
 )

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
 receipts.map((r: ReceiptForCustomer) => {
 const st = statusConfig[r.status ?? ''] || { text: r.status ?? '', variant: 'outline' as const }
 return (
 <TableRow key={r.id}>
 <TableCell className="font-mono">{r.receipt_number}</TableCell>
 <TableCell>{r.billing_periods?.name}</TableCell>
 <TableCell>{formatDate(r.due_date)}</TableCell>
 <TableCell className="font-bold">{formatCurrency(r.total_amount)}</TableCell>
 <TableCell>
 <Badge variant={st.variant}>{st.text}</Badge>
 </TableCell>
 </TableRow>
 )
 })
 )}
 </TableBody>
 </Table>
 </>
 )
}
