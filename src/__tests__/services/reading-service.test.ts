import { describe, it, expect, vi } from 'vitest'
import { ReadingService } from '@/services/reading-service'
import { readingRepository } from '@/repositories/reading-repository'

vi.mock('@/repositories/reading-repository', () => ({
  readingRepository: {
    create: vi.fn((data) => Promise.resolve(data))
  }
}))

describe('ReadingService - registerReading', () => {
  const service = new ReadingService()

  it('debería calcular el consumo correctamente', async () => {
    const data = {
      customer_id: 'cust-1',
      billing_period_id: 'period-1',
      previous_reading: 100,
      current_reading: 150,
      reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any)

    expect(result.consumption).toBe(50)
    expect(readingRepository.create).toHaveBeenCalled()
  })

  it('debería manejar correctamente las lecturas decrecientes', async () => {
    const data = {
      customer_id: 'cust-1',
      billing_period_id: 'period-1',
      previous_reading: 100,
      current_reading: 90,
      reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any)
    
    // Para lecturas decrecientes, el consumo debe ser 0
    expect(result.consumption).toBe(0)
    // Y debe estar marcada para revisión
    expect(result.needs_review).toBe(true)
    expect(readingRepository.create).toHaveBeenCalled()
  })
})
