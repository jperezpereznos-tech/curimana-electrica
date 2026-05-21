import { ConceptRepository } from '@/repositories/concept-repository'
import { AuditService } from '@/services/audit-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type ConceptInsert = Omit<Database['public']['Tables']['billing_concepts']['Insert'], 'id' | 'created_at'>

export class ConceptService {
  private conceptRepo: ConceptRepository
  private auditSvc: AuditService
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.conceptRepo = new ConceptRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient
  }

  async getAllConcepts() {
    return await this.conceptRepo.getAll()
  }

  async getActiveConcepts() {
    return await this.conceptRepo.getAllActive()
  }

  async createConcept(concept: { code: string; name: string; amount: number; type: string; description?: string; is_active: boolean; applies_to_tariff_id?: string | null }, userId?: string) {
    const result = await this.conceptRepo.create(concept as ConceptInsert)

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'billing_concepts',
          record_id: result.id,
          action: 'INSERT',
          new_data: { code: concept.code, name: concept.name, type: concept.type, amount: concept.amount },
        user_id: userId
      })
    } catch (e) { console.error('Audit log failed for createConcept:', e) }
    }

    return result
  }

  async updateConcept(id: string, concept: Partial<ConceptInsert>, userId?: string) {
    const result = await this.conceptRepo.update(id, concept)

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'billing_concepts',
          record_id: id,
          action: 'UPDATE',
          new_data: concept,
          user_id: userId
        })
      } catch (e) { console.error('Audit log failed for updateConcept:', e) }
    }

    return result
  }

  async toggleConceptStatus(id: string, isActive: boolean, userId?: string) {
    const result = await this.conceptRepo.update(id, { is_active: isActive })

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'billing_concepts',
          record_id: id,
          action: 'UPDATE',
          new_data: { is_active: isActive },
          user_id: userId
        })
      } catch (e) { console.error('Audit log failed for toggleConceptStatus:', e) }
    }

    return result
  }

  async deleteConcept(id: string, userId?: string) {
    const result = await this.conceptRepo.delete(id)

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'billing_concepts',
          record_id: id,
          action: 'DELETE',
          old_data: { id },
        user_id: userId
      })
    } catch (e) { console.error('Audit log failed for deleteConcept:', e) }
    }

    return result
  }
}

export function getConceptService(supabaseClient: SupabaseClient<Database>) {
  return new ConceptService(supabaseClient)
}
