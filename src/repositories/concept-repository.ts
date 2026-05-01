import { BaseRepository } from './base'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class ConceptRepository extends BaseRepository<'billing_concepts'> {
  constructor(supabaseClient?: SupabaseClient<Database>) {
    super('billing_concepts', supabaseClient)
  }

  async getAllActive() {
    const { data, error } = await this.supabase
      .from('billing_concepts')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data
  }
}
