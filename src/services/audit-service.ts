import { AuditRepository } from '@/repositories/audit-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']

export class AuditService {
  private auditRepo: AuditRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.auditRepo = new AuditRepository(supabaseClient)
  }

  async log(data: {
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data?: Record<string, unknown>
    new_data?: Record<string, unknown>
    user_id?: string
    user_role?: string
    ip_address?: string
  }) {
    await this.auditRepo.create({
      table_name: data.table_name,
      record_id: data.record_id,
      action: data.action,
      old_data: data.old_data ?? null,
      new_data: data.new_data ?? null,
      user_id: data.user_id ?? null,
      user_role: data.user_role ?? null,
      ip_address: data.ip_address ?? 'server-side'
    } as AuditLogInsert)
  }

  async getAuditLogs() {
    return await this.auditRepo.getAllLogs()
  }
}

export const auditService = new AuditService()

export function getAuditService(supabaseClient: SupabaseClient<Database>) {
  return new AuditService(supabaseClient)
}
