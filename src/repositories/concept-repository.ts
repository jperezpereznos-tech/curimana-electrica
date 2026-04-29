import { BaseRepository } from './base'
import { Database } from '@/types/database'

export class ConceptRepository extends BaseRepository<'billing_concepts'> {
  constructor() {
    super('billing_concepts')
  }

  async getAllActive() {
    const { data, error } = await this.supabase
      .from('billing_concepts')
      .select('*, tariffs(name)')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data
  }
}

export const conceptRepository = new ConceptRepository()
