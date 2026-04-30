import { readingRepository } from '@/repositories/reading-repository'
import { Database } from '@/types/database'
import { storageService } from './storage-service'

type ReadingInsert = Database['public']['Tables']['readings']['Insert']

export class ReadingService {
  /**
   * Registra una nueva lectura con validaciones de negocio.
   */
  async registerReading(data: Omit<ReadingInsert, 'consumption' | 'created_at'>) {
    const previous = Number(data.previous_reading)
    const current = Number(data.current_reading)

    // Handle decreasing meter readings properly (meter resets)
    if (current < previous) {
      // Log a warning for meter resets instead of throwing an error
      console.warn('Meter reset detected for customer. Creating reading with zero consumption and marking for review.')
    }

    const consumption = current < previous ? 0 : current - previous

    return await readingRepository.create({
      ...data,
      consumption,
      needs_review: current < previous
    })
  }

  async getLatestReading(customerId: string) {
    return await readingRepository.getLatestReadingByCustomer(customerId)
  }

  async getReadingsByPeriod(periodId: string) {
    return await readingRepository.getReadingsByPeriod(periodId)
  }

  /**
   * Sube una foto de lectura a Supabase Storage y devuelve la URL pública
   * @param file - El archivo de imagen a subir
   * @param supplyNumber - El número de suministro del cliente
   * @returns La URL pública de la imagen subida
   */
  async uploadReadingPhoto(file: File, supplyNumber: string): Promise<string> {
    // Convertir el archivo a base64
    const base64Image = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // Subir usando el storage service
    return await storageService.uploadReadingPhoto(base64Image, `${supplyNumber}_${Date.now()}.jpg`);
  }
}

export const readingService = new ReadingService()
