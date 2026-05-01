'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Download,
  Eye
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { pdfService } from '@/services/pdf-service'

export function ReceiptsList({ initialReceipts, periods, currentFilters }: any) {
  const router = useRouter()
  const [q, setQ] = useState(currentFilters.q || '')

  const updateFilters = (newFilters: any) => {
    const params = new URLSearchParams(window.location.search)
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) params.set(key, value as string)
      else params.delete(key)
    })
    router.push(`/admin/receipts?${params.toString()}`)
  }

  const handleDownload = (receipt: any) => {
    pdfService.generateReceiptPdf(receipt)
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-end bg-card p-4 rounded-lg border">
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <span className="text-xs font-medium text-muted-foreground uppercase">Suministro / Nombre</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && updateFilters({ q })}
            />
          </div>
        </div>

        <div className="space-y-1.5 w-48">
          <span className="text-xs font-medium text-muted-foreground uppercase">Periodo</span>
          <Select 
            defaultValue={currentFilters.period} 
            onValueChange={(val) => updateFilters({ period: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {periods.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 w-40">
          <span className="text-xs font-medium text-muted-foreground uppercase">Estado</span>
          <Select 
            defaultValue={currentFilters.status} 
            onValueChange={(val) => updateFilters({ status: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="partial">Parcial</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="cancelled">Anulado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => updateFilters({ q })}>Filtrar</Button>
      </div>

      {/* Tabla */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Recibo</TableHead>
              <TableHead>Suministro</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialReceipts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se encontraron recibos con estos filtros.
                </TableCell>
              </TableRow>
            ) : (
              initialReceipts.map((receipt: any) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-mono font-bold">{receipt.receipt_number}</TableCell>
                  <TableCell className="font-mono text-primary">{receipt.customers?.supply_number}</TableCell>
                  <TableCell className="font-medium">{receipt.customers?.full_name}</TableCell>
                  <TableCell>{receipt.billing_periods?.name}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(receipt.total_amount)}</TableCell>
                  <TableCell>
                <Badge variant={
                  receipt.status === 'paid' ? 'default' :
                  receipt.status === 'pending' ? 'outline' :
                  receipt.status === 'partial' ? 'secondary' :
                  'destructive'
                }>
                  {receipt.status === 'paid' ? 'Pagado' :
                   receipt.status === 'pending' ? 'Pendiente' :
                   receipt.status === 'partial' ? 'Parcial' :
                   receipt.status === 'overdue' ? 'Vencido' :
                   receipt.status === 'cancelled' ? 'Anulado' :
                   receipt.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
            <Button variant="ghost" size="icon" render={<Link href={`/admin/receipts/${receipt.id}`}><Eye className="h-4 w-4" /></Link>} />
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(receipt)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
