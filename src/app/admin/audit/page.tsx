import { getAuditService } from '@/services/audit-service'
import { createClient } from '@/lib/supabase/server'
import { AuditList } from './audit-list'

export default async function AuditPage() {
  const supabase = await createClient()
  const auditService = getAuditService(supabase)

  let logs: any[] = []
  try { logs = await auditService.getAuditLogs() } catch { }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bitacora de Auditoria</h2>
        <p className="text-muted-foreground">Registro historico de acciones criticas y cambios en el sistema.</p>
      </div>

      <AuditList initialLogs={logs} />
    </div>
  )
}
