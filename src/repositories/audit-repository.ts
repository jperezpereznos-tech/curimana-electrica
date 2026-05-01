import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class AuditRepository extends BaseRepository<'audit_logs'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('audit_logs', supabaseClient)
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
