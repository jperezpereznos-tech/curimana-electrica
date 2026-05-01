import { AdminLayout } from '@/components/layouts/admin-layout'
import { getAuditService } from '@/services/audit-service'
import { createClient } from '@/lib/supabase/server'
import { AuditList } from './audit-list'

export default async function AuditPage() {
  const supabase = await createClient()
  const auditService = getAuditService(supabase)
  const logs = await auditService.getAuditLogs()

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bitácora de Auditoría</h2>
          <p className="text-muted-foreground">Registro histórico de acciones críticas y cambios en el sistema.</p>
        </div>

        <AuditList initialLogs={logs} />
      </div>
    </AdminLayout>
  )
}
