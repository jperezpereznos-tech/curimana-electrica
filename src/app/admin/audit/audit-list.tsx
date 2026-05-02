'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE = 25

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)
}

export function AuditList({ initialLogs }: { initialLogs: any[] }) {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)

  const filteredLogs = initialLogs.filter(log => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      log.action?.toLowerCase().includes(q) ||
      log.table_name?.toLowerCase().includes(q) ||
      log.record_id?.toLowerCase().includes(q) ||
      log.user_id?.toLowerCase().includes(q) ||
      log.user_role?.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
  const paginated = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" /> Últimas Operaciones
        </CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar..."
            className="pl-8 h-8 text-sm"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(1) }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha / Hora</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>ID Registro</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No hay registros de auditoría disponibles.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDateTime(log.created_at || '')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={log.action === 'INSERT' ? 'default' : log.action === 'UPDATE' ? 'outline' : 'destructive'}
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.table_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.record_id?.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.user_id ? log.user_id.substring(0, 8) + '...' : '-'}
                  </TableCell>
                  <TableCell>
                    {log.user_role ? (
                      <Badge variant="outline" className="text-xs">{log.user_role}</Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px] truncate text-xs text-muted-foreground">
                      {JSON.stringify(log.new_data || log.old_data)}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4 border-t">
            <p className="text-sm text-muted-foreground">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredLogs.length)} de {filteredLogs.length}
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
      </CardContent>
    </Card>
  )
}
