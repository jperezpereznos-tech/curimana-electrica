import { ConceptRepository } from '@/repositories/concept-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type ConceptInsert = Omit<Database['public']['Tables']['billing_concepts']['Insert'], 'id' | 'created_at'>

export class ConceptService {
  private conceptRepo: ConceptRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.conceptRepo = new ConceptRepository(supabaseClient)
  }

  async getAllConcepts() {
    return await this.conceptRepo.getAll()
  }

  async getActiveConcepts() {
    return await this.conceptRepo.getAllActive()
  }

  async createConcept(concept: { code: string; name: string; amount: number; type: string; description?: string; is_active: boolean }) {
    return await this.conceptRepo.create(concept as ConceptInsert)
  }

  async updateConcept(id: string, concept: Partial<ConceptInsert>) {
    return await this.conceptRepo.update(id, concept)
  }

  async toggleConceptStatus(id: string, isActive: boolean) {
    return await this.conceptRepo.update(id, { is_active: isActive })
  }

  async deleteConcept(id: string) {
    return await this.conceptRepo.delete(id)
  }
}

export const conceptService = new ConceptService()

export function getConceptService(supabaseClient: SupabaseClient<Database>) {
  return new ConceptService(supabaseClient)
}
