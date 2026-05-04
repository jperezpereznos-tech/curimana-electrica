import { ReadingRepository } from '@/repositories/reading-repository'
import { AuditService } from '@/services/audit-service'
import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import { storageService } from './storage-service'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

type ReadingInsert = Database['public']['Tables']['readings']['Insert']
type ReadingUpdate = Database['public']['Tables']['readings']['Update']

export class ReadingService {
  private readingRepo: ReadingRepository
  private auditSvc: AuditService
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.readingRepo = new ReadingRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient ?? createBrowserClient()
  }

  async registerReading(data: Omit<ReadingInsert, 'consumption' | 'created_at' | 'needs_review'>, userId?: string) {
    const previous = Number(data.previous_reading)
    const current = Number(data.current_reading)

    const isMeterReset = current < previous
    const consumption = isMeterReset ? 0 : current - previous

    if (isMeterReset) {
      console.warn('Meter reset detected for customer. Creating reading with zero consumption and marking for review.')
    }

    const reading = await this.readingRepo.create({
      ...data,
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
      } catch {}
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

  async getActiveCustomersCount() {
    return await this.readingRepo.getActiveCustomersCount()
  }

  async getReviewCount() {
    return await this.readingRepo.getReviewCount()
  }

  async updateReading(readingId: string, data: ReadingUpdate, userId?: string) {
    const previous = Number(data.previous_reading ?? 0)
    const current = Number(data.current_reading ?? 0)
    const isMeterReset = current < previous
    const consumption = isMeterReset ? 0 : current - previous

    const updated = await this.readingRepo.update(readingId, {
      ...data,
      consumption,
      needs_review: isMeterReset || (data.needs_review as boolean),
    })

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'readings',
          record_id: readingId,
          action: 'UPDATE',
          new_data: { current_reading: current, previous_reading: previous, consumption, needs_review: isMeterReset },
          user_id: userId,
          user_role: 'admin'
        })
      } catch {}
    }

    return updated
  }

  async uploadReadingPhoto(file: File, supplyNumber: string): Promise<string> {
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    return await storageService.uploadReadingPhoto(base64Image, `${supplyNumber}_${Date.now()}.jpg`)
  }
}

export const readingService = new ReadingService()

export function getReadingService(supabaseClient: SupabaseClient<Database>) {
  return new ReadingService(supabaseClient)
}
