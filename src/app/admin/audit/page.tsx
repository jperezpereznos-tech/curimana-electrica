import { AdminLayout } from '@/components/layouts/admin-layout'
import { auditService } from '@/services/audit-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Shield, Clock, Database, User } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default async function AuditPage() {
  const logs = await auditService.getAuditLogs()

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bitácora de Auditoría</h2>
          <p className="text-muted-foreground">Registro histórico de acciones críticas y cambios en el sistema.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" /> Últimas 100 Operaciones
            </CardTitle>
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
                {logs.map((log) => (
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
                      {log.record_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate text-xs text-muted-foreground">
                        {JSON.stringify(log.new_data || log.old_data)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      No hay registros de auditoría disponibles.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
