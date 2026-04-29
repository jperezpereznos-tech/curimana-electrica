import { BaseRepository } from './base'
import { Database } from '@/types/database'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']
type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

export class AuditRepository extends BaseRepository<'audit_logs'> {
  constructor() {
    super('audit_logs')
  }

  async getAllLogs() {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return data
  }
}

export const auditRepository = new AuditRepository()
