'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Shield, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function AuditList({ initialLogs }: { initialLogs: any[] }) {
  const [filter, setFilter] = useState('')

  const filteredLogs = initialLogs.filter(log => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      log.action?.toLowerCase().includes(q) ||
      log.table_name?.toLowerCase().includes(q) ||
      log.record_id?.toLowerCase().includes(q)
    )
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" /> Últimas 100 Operaciones
        </CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar..."
            className="pl-8 h-8 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
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
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No hay registros de auditoría disponibles.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {formatDate(log.created_at || '')}
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
      </CardContent>
    </Card>
  )
}
