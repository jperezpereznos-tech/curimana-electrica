import { ReadingRepository } from '@/repositories/reading-repository'
import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'
import { storageService } from './storage-service'

type ReadingInsert = Database['public']['Tables']['readings']['Insert']

export class ReadingService {
  private readingRepo: ReadingRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.readingRepo = new ReadingRepository(supabaseClient)
  }

  async registerReading(data: Omit<ReadingInsert, 'consumption' | 'created_at' | 'needs_review'>) {
    const previous = Number(data.previous_reading)
    const current = Number(data.current_reading)

    const isMeterReset = current < previous
    const consumption = isMeterReset ? 0 : current - previous

    if (isMeterReset) {
      console.warn('Meter reset detected for customer. Creating reading with zero consumption and marking for review.')
    }

    return await this.readingRepo.create({
      ...data,
      consumption,
      needs_review: isMeterReset,
    })
  }

  async getLatestReading(customerId: string) {
    return await this.readingRepo.getLatestReadingByCustomer(customerId)
  }

  async getReadingsByPeriod(periodId: string) {
    return await this.readingRepo.getReadingsByPeriod(periodId)
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
