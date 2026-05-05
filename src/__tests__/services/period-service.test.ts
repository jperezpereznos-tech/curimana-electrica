import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeriodService } from '@/services/period-service'
import { PeriodRepository } from '@/repositories/period-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { ConceptRepository } from '@/repositories/concept-repository'
import { AuditService } from '@/services/audit-service'

const { mockRpc, mockFrom } = vi.hoisted(() => {
  const mockFromFn = vi.fn()
  return {
    mockRpc: vi.fn().mockImplementation((fnName: string) => {
      if (fnName === 'generate_period_receipts') {
        return Promise.resolve({ data: [{ generated_count: 1, skipped_count: 0 }], error: null })
      }
      return Promise.resolve({ data: [{ success: true, period_id: 'p1' }], error: null })
    }),
    mockFrom: mockFromFn
  }
})

vi.mock('@/repositories/period-repository')
vi.mock('@/repositories/customer-repository')
vi.mock('@/repositories/reading-repository')
vi.mock('@/repositories/receipt-repository')
vi.mock('@/repositories/concept-repository')
vi.mock('@/services/audit-service')
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: { getUser: vi.fn() }
  })
}))

function createAwaitableChain(resolvedValue: any) {
  const promise = Promise.resolve(resolvedValue)
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('PeriodService - calculatePeriodDates', () => {
  const service = new PeriodService()

  it('debería calcular correctamente el periodo de JUNIO 2025 (26 Mayo - 25 Junio)', () => {
    const result = service.calculatePeriodDates(2025, 6)

    expect(result.name).toBe('JUNIO 2025')
    expect(result.start_date).toBe('2025-05-26')
    expect(result.end_date).toBe('2025-06-25')
  })

  it('debería calcular correctamente el periodo de ENERO 2026 (26 Diciembre - 25 Enero)', () => {
    const result = service.calculatePeriodDates(2026, 1)

    expect(result.name).toBe('ENERO 2026')
    expect(result.start_date).toBe('2025-12-26')
    expect(result.end_date).toBe('2026-01-25')
  })
})

describe('PeriodService - closePeriod', () => {
  let service: PeriodService

  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'generate_period_receipts') {
        return Promise.resolve({ data: [{ generated_count: 1, skipped_count: 0 }], error: null })
      }
      return Promise.resolve({ data: [{ success: true, period_id: 'p1' }], error: null })
    })
    service = new PeriodService()
  })

  it('debería lanzar error si el periodo no existe', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(null as any)

    await expect(service.closePeriod('missing')).rejects.toThrow('Periodo no encontrado')
  })

  it('debería generar recibos para clientes activos con lecturas', async () => {
    const mockPeriod = { id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' }
    const mockReadings = [
      { id: 'rd1', customer_id: 'c1', consumption: 20, previous_reading: 100, current_reading: 120, reading_date: '2026-04-15' },
    ]

    const mockCustomers = {
      data: [
        { id: 'c1', is_active: true, current_debt: 0, tariff_id: 't1', tariffs: { tariff_tiers: [{ min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 }] } },
      ],
      error: null
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain(mockCustomers)
      return createAwaitableChain({ data: null, error: null })
    })

    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(mockPeriod as any)
    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue(mockReadings as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const result = await service.closePeriod('p1', 'user1') as any

    expect(result.receiptsGenerated).toBe(1)
    expect(mockRpc).toHaveBeenCalledWith('generate_period_receipts', expect.objectContaining({ p_period_id: 'p1' }))
    expect(mockRpc).toHaveBeenCalledWith('close_billing_period', { p_period_id: 'p1' })
    expect(AuditService.prototype.log).toHaveBeenCalled()
  })

  it('no debería generar recibos para clientes sin lectura', async () => {
    const mockPeriod = { id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' }
    const mockReadings = [
      { id: 'rd1', customer_id: 'c-other', consumption: 20, reading_date: '2026-04-15' },
    ]

    const mockCustomers = {
      data: [
        { id: 'c1', is_active: true, current_debt: 0, tariff_id: 't1', tariffs: { tariff_tiers: [] } },
      ],
      error: null
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain(mockCustomers)
      return createAwaitableChain({ data: null, error: null })
    })

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'generate_period_receipts') {
        return Promise.resolve({ data: [{ generated_count: 0, skipped_count: 0 }], error: null })
      }
      return Promise.resolve({ data: [{ success: true, period_id: 'p1' }], error: null })
    })

    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(mockPeriod as any)
    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue(mockReadings as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    const result = await service.closePeriod('p1') as any

    expect(result.receiptsGenerated).toBe(0)
    expect(mockRpc).toHaveBeenCalledWith('generate_period_receipts', expect.objectContaining({ p_period_id: 'p1' }))
  })
})
