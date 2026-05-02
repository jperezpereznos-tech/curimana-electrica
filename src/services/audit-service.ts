import { AuditRepository } from '@/repositories/audit-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class AuditService {
  private auditRepo: AuditRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.auditRepo = new AuditRepository(supabaseClient)
  }

  async log(data: {
    table_name: string
    record_id: string
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    old_data?: any
    new_data?: any
    user_id?: string
    user_role?: string
  }) {
    await this.auditRepo.create({
      ...data,
      ip_address: '0.0.0.0'
    } as any)
  }

  async getAuditLogs() {
    return await this.auditRepo.getAllLogs()
  }
}

export const auditService = new AuditService()

export function getAuditService(supabaseClient: SupabaseClient<Database>) {
  return new AuditService(supabaseClient)
}
