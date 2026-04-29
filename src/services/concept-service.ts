import { conceptRepository } from '@/repositories/concept-repository'
import { Database } from '@/types/database'

type ConceptInsert = Omit<Database['public']['Tables']['billing_concepts']['Insert'], 'id' | 'created_at'>

export class ConceptService {
  async getAllConcepts() {
    return await conceptRepository.getAll()
  }

  async getActiveConcepts() {
    return await conceptRepository.getAllActive()
  }

  async createConcept(concept: { code: string; name: string; amount: number; type: string; description?: string; is_active: boolean }) {
    return await conceptRepository.create(concept as ConceptInsert)
  }

  async updateConcept(id: string, concept: Partial<ConceptInsert>) {
    return await conceptRepository.update(id, concept)
  }

  async toggleConceptStatus(id: string, isActive: boolean) {
    return await conceptRepository.update(id, { is_active: isActive })
  }

  async deleteConcept(id: string) {
    return await conceptRepository.delete(id)
  }
}

export const conceptService = new ConceptService()
