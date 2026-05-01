import { describe, it, expect, vi } from 'vitest'
import { ReadingService } from '@/services/reading-service'

vi.mock('@/repositories/reading-repository', () => {
  class MockReadingRepository {
    create = vi.fn((data: any) => Promise.resolve(data))
    getLatestReadingByCustomer = vi.fn()
    getReadingsByPeriod = vi.fn()
  }
  return {
    ReadingRepository: MockReadingRepository,
    readingRepository: new MockReadingRepository(),
  }
})

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
    expect(result.needs_review).toBe(false)
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

    expect(result.consumption).toBe(0)
    expect(result.needs_review).toBe(true)
  })
})
