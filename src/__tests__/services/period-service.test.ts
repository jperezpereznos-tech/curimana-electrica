import { describe, it, expect } from 'vitest'
import { PeriodService } from '@/services/period-service'

describe('PeriodService - calculatePeriodDates', () => {
  const service = new PeriodService()

  it('debería calcular correctamente el periodo de JUNIO 2025 (26 Mayo - 25 Junio)', () => {
    const year = 2025
    const month = 6
    const result = service.calculatePeriodDates(year, month)

    expect(result.name).toBe('JUNIO 2025')
    expect(result.start_date).toBe('2025-05-26')
    expect(result.end_date).toBe('2025-06-25')
  })

  it('debería calcular correctamente el periodo de ENERO 2026 (26 Diciembre - 25 Enero)', () => {
    const year = 2026
    const month = 1
    const result = service.calculatePeriodDates(year, month)

    expect(result.name).toBe('ENERO 2026')
    expect(result.start_date).toBe('2025-12-26')
    expect(result.end_date).toBe('2026-01-25')
  })
})
