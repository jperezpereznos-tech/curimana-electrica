import { readingRepository } from '@/repositories/reading-repository'
import { Database } from '@/types/database'

type ReadingInsert = Database['public']['Tables']['readings']['Insert']

export class ReadingService {
  /**
   * Registra una nueva lectura con validaciones de negocio.
   */
  async registerReading(data: Omit<ReadingInsert, 'consumption' | 'created_at'>) {
    const previous = Number(data.previous_reading)
    const current = Number(data.current_reading)

    if (current < previous) {
      // Nota: En la vida real esto puede pasar si el medidor se reinicia, 
      // pero por ahora lanzamos error o marcamos para revisión.
      throw new Error('La lectura actual no puede ser menor a la lectura anterior.')
    }

    const consumption = current - previous

    return await readingRepository.create({
      ...data,
      consumption
    })
  }

  async getLatestReading(customerId: string) {
    return await readingRepository.getLatestReadingByCustomer(customerId)
  }

  async getReadingsByPeriod(periodId: string) {
    return await readingRepository.getReadingsByPeriod(periodId)
  }

  /**
   * Simula la subida de una foto a Supabase Storage.
   * En una implementación real, se usaría supabase.storage.from('readings').upload()
   */
  async uploadReadingPhoto(file: File, supplyNumber: string): Promise<string> {
    const fileName = `${supplyNumber}_${Date.now()}.jpg`
    // Mock URL
    return `https://supabase.storage/readings/${fileName}`
  }
}

export const readingService = new ReadingService()
