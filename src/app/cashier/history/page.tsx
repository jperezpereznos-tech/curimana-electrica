'use client'

import { useState, useEffect, useMemo, startTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Search,
  Calendar,
  Download,
  Receipt,
  User,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { getPaymentsByCashierAction } from '../actions'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { AnimatedNumber } from '@/components/animated-number'
import { StaggerReveal } from '@/components/stagger-reveal'
import type { CashierHistoryPayment } from '@/types/views'

export default function CashierHistoryPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [payments, setPayments] = useState<CashierHistoryPayment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('today')
  const [currentPage, setCurrentPage] = useState(1)
  const [fetchDone, setFetchDone] = useState(false)
  const itemsPerPage = 10

  const loading = authLoading || !fetchDone

  function toLocalDateString(date: Date): string {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const dateFilterParams = useMemo(() => {
    const now = new Date()
    const today = toLocalDateString(now)
    if (dateFilter === 'today') return { from: today, to: today + 'T23:59:59' }
    if (dateFilter === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { from: toLocalDateString(weekAgo), to: today + 'T23:59:59' }
    }
    if (dateFilter === 'month') {
      const monthAgo = new Date(now)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return { from: toLocalDateString(monthAgo), to: today + 'T23:59:59' }
    }
    return {}
  }, [dateFilter])

  useEffect(() => {
    if (!user) {
      startTransition(() => { setFetchDone(true) })
      return
    }
    let cancelled = false
    startTransition(() => { setFetchDone(false) })

    getPaymentsByCashierAction(user.id, dateFilterParams)
      .then((result) => {
        if (!cancelled && result.success) {
          setPayments(result.data)
          setCurrentPage(1)
        }
      })
      .catch((e) => { console.error('Error fetching payment history:', e) })
      .finally(() => {
        if (!cancelled) setFetchDone(true)
      })

    return () => { cancelled = true }
  }, [user, dateFilterParams])

  const filteredPayments = payments.filter(p =>
    p.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supply_number?.includes(searchTerm) ||
    p.receipt_number?.includes(searchTerm)
  )

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalAmount = Math.round(filteredPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100

  const handleExport = () => {
    function escapeCsvField(value: string): string {
      const str = String(value ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }
    const headers = ['Recibo', 'Cliente', 'Suministro', 'Monto', 'Fecha', 'Referencia']
    const rows = filteredPayments.map(p => [
      p.receipt_number,
      p.customer_name,
      p.supply_number,
      p.amount.toString(),
      formatDate(p.payment_date),
      p.reference || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(escapeCsvField).join(','))].join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cobros_${toLocalDateString(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <StaggerReveal>
    <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Historial de Cobros</h2>
            <p className="text-muted-foreground">
              Registro de pagos procesados en tu sesión de caja
            </p>
          </div>
          <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
          </div>
        </div>

        {/* Resumen */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Cobrado (Hoy)
              </CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">S/ <AnimatedNumber value={totalAmount} decimals={2} duration={600} /></div>
              <p className="text-xs text-muted-foreground">
                {filteredPayments.length} pagos registrados
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Promedio por Pago
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
      <div className="text-2xl font-bold">
        S/ <AnimatedNumber value={filteredPayments.length > 0 ? Math.round(totalAmount / filteredPayments.length * 100) / 100 : 0} decimals={2} duration={600} />
              </div>
              <p className="text-xs text-muted-foreground">Monto promedio</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Último Pago
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payments.length > 0 ? formatDate(payments[0].payment_date) : '-'}
              </div>
              <p className="text-xs text-muted-foreground">Fecha del último cobro</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y Búsqueda */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, suministro o recibo..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
  <Calendar className="h-4 w-4 text-muted-foreground" />
  <Select value={dateFilter} onValueChange={(v) => { if (v) setDateFilter(v) }}>
    <SelectTrigger className="w-36 h-10">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="today">Hoy</SelectItem>
      <SelectItem value="week">Esta semana</SelectItem>
      <SelectItem value="month">Este mes</SelectItem>
    </SelectContent>
  </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recibo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Suministro</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Cargando pagos...
                    </TableCell>
                  </TableRow>
                ) : paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No se encontraron pagos
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs">
                        {payment.receipt_number}
                      </TableCell>
                      <TableCell>{payment.customer_name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.supply_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(payment.payment_date, { includeTime: true })}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.reference}
                      </TableCell>
                      <TableCell className="text-right">
                  <StatusBadge status={payment.status === 'completed' ? 'completed' : 'voided'} type="payment" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredPayments.length)} de {filteredPayments.length} resultados
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
    </StaggerReveal>
  )
}
