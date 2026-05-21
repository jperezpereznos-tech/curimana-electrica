import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeriodService } from '@/services/period-service'
import { PeriodRepository } from '@/repositories/period-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
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

function createAwaitableChain(resolvedValue: any) {
  const promise = Promise.resolve(resolvedValue)
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

const mockSupabase = {
  from: mockFrom,
  rpc: mockRpc,
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'test-user' } }, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
    }),
  },
} as any

describe('PeriodService - calculatePeriodDates', () => {
  const service = new PeriodService(mockSupabase)

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

  it('debería calcular correctamente el periodo de DICIEMBRE 2025', () => {
    const result = service.calculatePeriodDates(2025, 12)

    expect(result.name).toBe('DICIEMBRE 2025')
    expect(result.start_date).toBe('2025-11-26')
    expect(result.end_date).toBe('2025-12-25')
  })

  it('debería calcular correctamente el periodo de FEBRERO 2025 (26 Enero - 25 Febrero)', () => {
    const result = service.calculatePeriodDates(2025, 2)

    expect(result.name).toBe('FEBRERO 2025')
    expect(result.start_date).toBe('2025-01-26')
    expect(result.end_date).toBe('2025-02-25')
  })

  it('debería respetar un cutDay personalizado', () => {
    const result = service.calculatePeriodDates(2025, 6, 1)

    expect(result.start_date).toBe('2025-05-01')
    expect(result.end_date).toBe('2025-05-31')
  })

  it('debería marcar is_closed como false', () => {
    const result = service.calculatePeriodDates(2025, 6)

    expect(result.is_closed).toBe(false)
  })

  it('debería incluir year y month en el resultado', () => {
    const result = service.calculatePeriodDates(2025, 6)

    expect(result.year).toBe(2025)
    expect(result.month).toBe(6)
  })

  it('debería calcular correctamente el nombre en español para MARZO', () => {
    const result = service.calculatePeriodDates(2025, 3)

    expect(result.name).toBe('MARZO 2025')
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
    service = new PeriodService(mockSupabase)
  })

  it('debería lanzar error si el periodo no existe', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(null as any)

    await expect(service.closePeriod('missing')).rejects.toThrow('Periodo no encontrado')
  })

  it('debería lanzar error si el periodo ya está cerrado', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: true } as any)

    await expect(service.closePeriod('p1')).rejects.toThrow('El periodo ya está cerrado')
  })

  it('debería lanzar error si falla la obtención de configuración municipal', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: false } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: null, error: { message: 'RPC error', code: '42501' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.closePeriod('p1')).rejects.toThrow('Error al obtener configuración municipal (payment_grace_days)')
  })

  it('debería lanzar error si falla la consulta de clientes activos', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain({ data: null, error: { message: 'Customer query failed' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.closePeriod('p1')).rejects.toThrow('Customer query failed')
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

  it('debería lanzar error si generate_period_receipts RPC falla', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain({ data: [], error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'generate_period_receipts') {
        return Promise.resolve({ data: null, error: { message: 'RPC failed' } })
      }
      return Promise.resolve({ data: [{ success: true }], error: null })
    })

    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue([] as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    await expect(service.closePeriod('p1')).rejects.toEqual(expect.objectContaining({ message: 'RPC failed' }))
  })

  it('debería lanzar error si close_billing_period RPC falla', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain({ data: [], error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'generate_period_receipts') {
        return Promise.resolve({ data: [{ generated_count: 0, skipped_count: 0 }], error: null })
      }
      if (fnName === 'close_billing_period') {
        return Promise.resolve({ data: null, error: { message: 'Close failed' } })
      }
      return Promise.resolve({ data: null, error: null })
    })

    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue([] as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    await expect(service.closePeriod('p1')).rejects.toEqual(expect.objectContaining({ message: 'Close failed' }))
  })

  it('debería lanzar error si close_billing_period retorna success=false', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain({ data: [], error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'generate_period_receipts') {
        return Promise.resolve({ data: [{ generated_count: 0, skipped_count: 0 }], error: null })
      }
      if (fnName === 'close_billing_period') {
        return Promise.resolve({ data: [{ success: false }], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue([] as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    await expect(service.closePeriod('p1')).rejects.toThrow('El periodo ya está cerrado o no existe')
  })

  it('debería lanzar error si close_billing_period retorna array vacío', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain({ data: [], error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    mockRpc.mockImplementation((fnName: string) => {
      if (fnName === 'generate_period_receipts') {
        return Promise.resolve({ data: [{ generated_count: 0, skipped_count: 0 }], error: null })
      }
      if (fnName === 'close_billing_period') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({ data: null, error: null })
    })

    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue([] as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    await expect(service.closePeriod('p1')).rejects.toThrow('El periodo ya está cerrado o no existe')
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain({ data: [], error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue([] as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.closePeriod('p1')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla (no lanzar error)', async () => {
    const mockPeriod = { id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { payment_grace_days: 20 }, error: null })
      if (table === 'customers') return createAwaitableChain({ data: [], error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(mockPeriod as any)
    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue([] as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit service down'))

    const result = await service.closePeriod('p1', 'user1') as any

    expect(result.period_id).toBe('p1')
  })

  it('debería usar payment_grace_days por defecto de 20 si config no lo tiene', async () => {
    const mockPeriod = { id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: {}, error: null })
      if (table === 'customers') return createAwaitableChain({ data: [], error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    vi.spyOn(PeriodRepository.prototype, 'getById').mockResolvedValue(mockPeriod as any)
    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue([] as any)
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    const result = await service.closePeriod('p1') as any

    expect(result).toBeDefined()
  })

  it('debería incluir clientes sin lectura en skipped', async () => {
    const mockPeriod = { id: 'p1', is_closed: false, start_date: '2026-03-26', end_date: '2026-04-25' }
    const mockReadings: any[] = []

    const mockCustomers = {
      data: [
        { id: 'c1', supply_number: 'SUM-001', is_active: true, current_debt: 0, tariff_id: 't1', tariffs: { tariff_tiers: [] } },
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

    expect(result.skipped).toBe(1)
  })
})

describe('PeriodService - createNextPeriod', () => {
  let service: PeriodService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PeriodService(mockSupabase)
  })

  it('debería lanzar error si existe un periodo abierto', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue({ id: 'p1', is_closed: false } as any)

    await expect(service.createNextPeriod()).rejects.toThrow('No se puede crear un nuevo periodo mientras exista uno abierto')
  })

  it('debería crear periodo siguiente al último existente', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p2' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { billing_cut_day: 26 }, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: { id: 'p1', year: 2025, month: 5, is_closed: true }, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.createNextPeriod('user1')

    expect(result).toEqual({ id: 'p2' })
    expect(PeriodRepository.prototype.create).toHaveBeenCalledWith(expect.objectContaining({ year: 2025, month: 6 }))
  })

  it('debería incrementar el año al pasar de diciembre a enero', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p-new' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { billing_cut_day: 26 }, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: { id: 'p12', year: 2025, month: 12, is_closed: true }, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    await service.createNextPeriod()

    expect(PeriodRepository.prototype.create).toHaveBeenCalledWith(expect.objectContaining({ year: 2026, month: 1 }))
  })

  it('debería usar la fecha actual si no existe ningún periodo previo', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p-new' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { billing_cut_day: 26 }, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    await service.createNextPeriod()

    expect(PeriodRepository.prototype.create).toHaveBeenCalled()
  })

  it('debería lanzar error si falla la consulta de configuración municipal', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: null, error: { message: 'Config error' } })
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.createNextPeriod()).rejects.toThrow('Error al obtener configuración municipal (billing_cut_day)')
  })

  it('debería usar billing_cut_day por defecto 26 si config no lo tiene', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p-new' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: {}, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: { id: 'p1', year: 2025, month: 5, is_closed: true }, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    await service.createNextPeriod()

    expect(PeriodRepository.prototype.create).toHaveBeenCalledWith(expect.objectContaining({ start_date: expect.stringContaining('26') }))
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p-new' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { billing_cut_day: 26 }, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: { id: 'p1', year: 2025, month: 5, is_closed: true }, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    await service.createNextPeriod('user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'billing_periods',
      action: 'INSERT',
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p-new' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { billing_cut_day: 26 }, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: { id: 'p1', year: 2025, month: 5, is_closed: true }, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    await service.createNextPeriod()

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p-new' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { billing_cut_day: 26 }, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: { id: 'p1', year: 2025, month: 5, is_closed: true }, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.createNextPeriod('user1')

    expect(result).toEqual({ id: 'p-new' })
  })

  it('debería permitir crear periodo si el último periodo está cerrado', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)
    vi.spyOn(PeriodRepository.prototype, 'create').mockResolvedValue({ id: 'p-new' } as any)

    mockFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') return createAwaitableChain({ data: { billing_cut_day: 26 }, error: null })
      if (table === 'billing_periods') return createAwaitableChain({ data: { id: 'p1', year: 2025, month: 5, is_closed: true }, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    await service.createNextPeriod()

    expect(PeriodRepository.prototype.create).toHaveBeenCalled()
  })
})

describe('PeriodService - getAllPeriods', () => {
  let service: PeriodService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PeriodService(mockSupabase)
  })

  it('debería delegar al repositorio', async () => {
    const mockPeriods = [
      { id: 'p1', year: 2025, month: 6, name: 'JUNIO 2025', is_closed: true },
      { id: 'p2', year: 2025, month: 5, name: 'MAYO 2025', is_closed: false }
    ]
    vi.spyOn(PeriodRepository.prototype, 'getAllPeriods').mockResolvedValue(mockPeriods as any)

    const result = await service.getAllPeriods()

    expect(result).toEqual(mockPeriods)
    expect(PeriodRepository.prototype.getAllPeriods).toHaveBeenCalled()
  })
})

describe('PeriodService - getCurrentPeriod', () => {
  let service: PeriodService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new PeriodService(mockSupabase)
  })

  it('debería delegar al repositorio', async () => {
    const mockPeriod = { id: 'p1', year: 2025, month: 6, name: 'JUNIO 2025', is_closed: false }
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(mockPeriod as any)

    const result = await service.getCurrentPeriod()

    expect(result).toEqual(mockPeriod)
    expect(PeriodRepository.prototype.getCurrentPeriod).toHaveBeenCalled()
  })

  it('debería retornar null si no hay periodo abierto', async () => {
    vi.spyOn(PeriodRepository.prototype, 'getCurrentPeriod').mockResolvedValue(null)

    const result = await service.getCurrentPeriod()

    expect(result).toBeNull()
  })
})
