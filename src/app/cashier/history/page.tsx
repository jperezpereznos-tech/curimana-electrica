'use client'

import { useState, useEffect } from 'react'
import { CashierLayout } from '@/components/layouts/cashier-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function CashierHistoryPage() {
  const { user } = useAuth()
  const [payments, setPayments] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState('today')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  function getDateFilterParams(filter: string): { from?: string; to?: string } {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    if (filter === 'today') return { from: today, to: today + 'T23:59:59' }
    if (filter === 'week') {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { from: weekAgo.toISOString().split('T')[0], to: today + 'T23:59:59' }
    }
    if (filter === 'month') {
      const monthAgo = new Date(now)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return { from: monthAgo.toISOString().split('T')[0], to: today + 'T23:59:59' }
    }
    return {}
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const dateFilterParams = getDateFilterParams(dateFilter)

    getPaymentsByCashierAction(user.id, dateFilterParams)
      .then((data) => {
        if (!cancelled) setPayments(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user, dateFilter])

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

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0)

  const handleExport = () => {
    const headers = ['Recibo', 'Cliente', 'Suministro', 'Monto', 'Fecha', 'Referencia']
    const rows = filteredPayments.map(p => [
      p.receipt_number,
      p.customer_name,
      p.supply_number,
      p.amount.toString(),
      formatDate(p.payment_date),
      p.reference || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cobros_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <CashierLayout>
      <div className="flex flex-col gap-6">
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
              <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
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
                {formatCurrency(filteredPayments.length > 0 ? totalAmount / filteredPayments.length : 0)}
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
                <select 
                  className="border rounded-md px-3 py-2 text-sm"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="today">Hoy</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                </select>
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
                        <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                          {payment.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </Badge>
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
      </div>
    </CashierLayout>
  )
}
