import { ReadingRepository } from '@/repositories/reading-repository'
import { AuditService } from '@/services/audit-service'
import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

type ReadingInsert = Database['public']['Tables']['readings']['Insert']
type ReadingUpdate = Database['public']['Tables']['readings']['Update']

export class ReadingService {
  private readingRepo: ReadingRepository
  private auditSvc: AuditService

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.readingRepo = new ReadingRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
  }

  async registerReading(data: Omit<ReadingInsert, 'consumption' | 'created_at' | 'needs_review'>, userId?: string) {
    const previous = Number(data.previous_reading) || 0
    const current = Number(data.current_reading) || 0

    const isMeterReset = current < previous
    const consumption = isMeterReset ? 0 : current - previous

    if (isMeterReset) {
      console.warn('Meter reset detected for customer. Creating reading with zero consumption and marking for review.')
    }

    const reading = await this.readingRepo.create({
      ...data,
      previous_reading: previous,
      current_reading: current,
      consumption,
      needs_review: isMeterReset,
      ...(userId ? { meter_reader_id: userId } : {}),
    })

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'readings',
          record_id: reading.id,
          action: 'INSERT',
          new_data: { customer_id: data.customer_id, previous_reading: previous, current_reading: current, consumption, needs_review: isMeterReset },
          user_id: userId,
        user_role: 'meter_reader'
      })
    } catch (e) { console.error('Audit log failed for registerReading:', e) }
    }

    return reading
  }

  async getLatestReading(customerId: string) {
    return await this.readingRepo.getLatestReadingByCustomer(customerId)
  }

  async getReadingsByPeriod(periodId: string) {
    return await this.readingRepo.getReadingsByPeriod(periodId)
  }

  async getAllForAdmin(periodId?: string, needsReviewOnly?: boolean) {
    return await this.readingRepo.getAllForAdmin(periodId, needsReviewOnly)
  }

  async getLatestReadings() {
    return await this.readingRepo.getLatestReadings()
  }

  async getTodayReadingsCount() {
    return await this.readingRepo.getTodayReadingsCount()
  }

  async getActiveCustomersCount(sectorId?: string) {
    return await this.readingRepo.getActiveCustomersCount(sectorId)
  }

  async getReviewCount() {
    return await this.readingRepo.getReviewCount()
  }

  async updateReading(readingId: string, data: ReadingUpdate, userId?: string) {
    const hasReadingValues = data.previous_reading !== undefined || data.current_reading !== undefined

    let consumption: number | undefined
    let needsReview: boolean | undefined

    if (hasReadingValues) {
      const existing = await this.readingRepo.getById(readingId)
      const previous = Number(data.previous_reading ?? existing.previous_reading) || 0
      const current = Number(data.current_reading ?? existing.current_reading) || 0
      const isMeterReset = current < previous
      consumption = isMeterReset ? 0 : current - previous
      needsReview = isMeterReset || (data.needs_review as boolean) || false
    } else if (data.needs_review !== undefined) {
      needsReview = data.needs_review as boolean
    }

    const updated = await this.readingRepo.update(readingId, {
      ...data,
      ...(consumption !== undefined ? { consumption } : {}),
      ...(needsReview !== undefined ? { needs_review: needsReview } : {}),
    })

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'readings',
          record_id: readingId,
          action: 'UPDATE',
          new_data: { ...(consumption !== undefined ? { consumption } : {}), needs_review: needsReview },
          user_id: userId,
          user_role: 'admin'
        })
      } catch (e) { console.error('Audit log failed for updateReading:', e) }
    }

    return updated
  }
}

export const readingService = new ReadingService()

export function getReadingService(supabaseClient: SupabaseClient<Database>) {
  return new ReadingService(supabaseClient)
}
