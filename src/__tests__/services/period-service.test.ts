import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeriodService } from '@/services/period-service'
import { PeriodRepository } from '@/repositories/period-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { ConceptRepository } from '@/repositories/concept-repository'
import { AuditService } from '@/services/audit-service'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn().mockResolvedValue({ data: [{ success: true, period_id: 'p1' }], error: null })
}))

vi.mock('@/repositories/period-repository')
vi.mock('@/repositories/customer-repository')
vi.mock('@/repositories/reading-repository')
vi.mock('@/repositories/receipt-repository')
vi.mock('@/repositories/concept-repository')
vi.mock('@/services/audit-service')
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: { getUser: vi.fn() }
  })
}))

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

describe('PeriodService - closePeriod', () => {
  const service = new PeriodService()

  beforeEach(() => {
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: [{ success: true, period_id: 'p1' }], error: null })
  })

  it('debería lanzar error si el periodo no existe', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(null as any)

    await expect(service.closePeriod('missing')).rejects.toThrow('Periodo no encontrado')
  })

  it('debería generar recibos para clientes activos con lecturas', async () => {
    const mockPeriod = { id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' }
    const mockCustomers = [
      { id: 'c1', is_active: true, current_debt: 0, tariffs: { tariff_tiers: [{ min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 }] } },
      { id: 'c2', is_active: false, current_debt: 50, tariffs: null },
    ]
    const mockReadings = [
      { id: 'rd1', customer_id: 'c1', consumption: 20, previous_reading: 100, current_reading: 120 },
    ]

    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(mockPeriod as any)
    vi.spyOn(CustomerRepository.prototype, 'searchCustomers').mockResolvedValue(mockCustomers as any)
    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue(mockReadings as any)
    vi.spyOn(ReceiptRepository.prototype, 'create').mockResolvedValue({ id: 'rc1' } as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const result = await service.closePeriod('p1', 'user1') as any

    expect(result.receiptsGenerated).toBe(1)
    expect(ReceiptRepository.prototype.create).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('close_billing_period', { p_period_id: 'p1' })
    expect(AuditService.prototype.log).toHaveBeenCalled()
  })

  it('no debería generar recibos para clientes sin lectura', async () => {
    const mockPeriod = { id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' }
    const mockCustomers = [
      { id: 'c1', is_active: true, current_debt: 0, tariffs: { tariff_tiers: [] } },
    ]
    const mockReadings = [
      { id: 'rd1', customer_id: 'c-other', consumption: 20 },
    ]

    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(mockPeriod as any)
    vi.spyOn(CustomerRepository.prototype, 'searchCustomers').mockResolvedValue(mockCustomers as any)
    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue(mockReadings as any)
    vi.spyOn(ReceiptRepository.prototype, 'create').mockResolvedValue({} as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    const result = await service.closePeriod('p1') as any

    expect(result.receiptsGenerated).toBe(0)
    expect(ReceiptRepository.prototype.create).not.toHaveBeenCalled()
  })
})
