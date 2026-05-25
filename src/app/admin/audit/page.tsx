import { getAuditService } from '@/services/audit-service'
import { createClient } from '@/lib/supabase/server'
import { AuditList } from './audit-list'
import type { AuditLogRow } from '@/types/views'

export default async function AuditPage() {
  const supabase = await createClient()
  const auditService = getAuditService(supabase)

  let logs: AuditLogRow[] = []
  let errorMsg = ''
  try { logs = await auditService.getAuditLogs() } catch (e) { errorMsg = e instanceof Error ? e.message : String(e) }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight">Bitacora de Auditoria</h2>
        <p className="text-muted-foreground">Registro historico de acciones criticas y cambios en el sistema.</p>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error: {errorMsg}
        </div>
      )}

      <AuditList initialLogs={logs} />
    </div>
  )
}
