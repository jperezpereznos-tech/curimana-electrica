import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardService } from '@/services/dashboard-service'

const { mockFrom } = vi.hoisted(() => {
  const mockFromFn = vi.fn()
  return { mockFrom: mockFromFn }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: { getUser: vi.fn() }
  })
}))

function createAwaitableChain(resolvedValue: any) {
  const promise = Promise.resolve(resolvedValue)
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('DashboardService - getSummaryKPIs', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ from: mockFrom } as any)
  })

  it('debería obtener KPIs con periodo abierto', async () => {
    let callIndex = 0
    const paymentsPromise = Promise.resolve({ data: [{ amount: 100 }, { amount: 200 }], error: null })
    const customersDataPromise = Promise.resolve({ data: [{ current_debt: 500 }, { current_debt: 300 }], error: null })
    const customersCountPromise = Promise.resolve({ count: 10, error: null })
    const periodPromise = Promise.resolve({ data: { id: 'p1' }, error: null })
    const receiptsPromise = Promise.resolve({ count: 5, error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnValue(paymentsPromise),
          then: paymentsPromise.then.bind(paymentsPromise),
        }
        return chain
      }
      if (table === 'customers') {
        callIndex++
        if (callIndex === 1) {
          const chain: any = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: customersDataPromise.then.bind(customersDataPromise),
          }
          chain.eq.mockReturnValue(customersDataPromise)
          return chain
        }
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnValue(customersCountPromise),
        }
        return chain
      }
      if (table === 'billing_periods') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockReturnValue(periodPromise),
        }
        return chain
      }
      if (table === 'receipts') {
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue(receiptsPromise),
        }
        return chain
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getSummaryKPIs()

    expect(result).toEqual({
      totalCollected: 300,
      totalDebt: 800,
      activeCustomers: 10,
      pendingReceipts: 5
    })
  })

  it('debería obtener KPIs sin periodo abierto', async () => {
    const paymentsPromise = Promise.resolve({ data: [], error: null })
    const customersDataPromise = Promise.resolve({ data: [], error: null })
    const customersCountPromise = Promise.resolve({ count: 0, error: null })
    const periodPromise = Promise.resolve({ data: null, error: null })
    const receiptsPromise = Promise.resolve({ count: 3, error: null })

    let customersCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnValue(paymentsPromise) }
      }
      if (table === 'customers') {
        customersCallCount++
        if (customersCallCount === 1) {
          return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue(customersDataPromise) }
        }
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnValue(customersCountPromise) }
      }
      if (table === 'billing_periods') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnValue(periodPromise) }
      }
      if (table === 'receipts') {
        return { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnValue(receiptsPromise) }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getSummaryKPIs()

    expect(result.totalCollected).toBe(0)
    expect(result.totalDebt).toBe(0)
    expect(result.activeCustomers).toBe(0)
    expect(result.pendingReceipts).toBe(3)
  })

  it('debería lanzar error si payments falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: null, error: { message: 'Payments error' } }) }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.getSummaryKPIs()).rejects.toThrow('KPI payments')
  })

  it('debería lanzar error si customers falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: [], error: null }) }
      }
      if (table === 'customers') {
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Customers error' } }) }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.getSummaryKPIs()).rejects.toThrow('KPI deuda')
  })
})

describe('DashboardService - getRevenueHistory', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ from: mockFrom } as any)
  })

  it('debería obtener historial de ingresos', async () => {
    const mockPeriods = [
      { name: 'JUNIO 2025', receipts: [{ paid_amount: 100, status: 'paid' }, { paid_amount: 50, status: 'pending' }] },
      { name: 'MAYO 2025', receipts: [{ paid_amount: 200, status: 'paid' }] },
    ]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') {
        const promise = Promise.resolve({ data: mockPeriods, error: null })
        const chain: any = {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnValue(promise),
          then: promise.then.bind(promise),
        }
        return chain
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getRevenueHistory()

    expect(result).toEqual([
      { name: 'JUNIO 2025', total: 100 },
      { name: 'MAYO 2025', total: 200 },
    ])
  })

  it('debería retornar array vacío si no hay periodos', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getRevenueHistory()

    expect(result).toEqual([])
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: { message: 'Revenue error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.getRevenueHistory()).rejects.toThrow('Ingresos')
  })
})

describe('DashboardService - getConsumptionBySector', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ from: mockFrom } as any)
  })

  it('debería obtener consumo por sector', async () => {
    const mockData = [
      { consumption: 100, customers: { sector_id: 's1', sectors: { name: 'Centro' } } },
      { consumption: 50, customers: { sector_id: 's1', sectors: { name: 'Centro' } } },
      { consumption: 80, customers: { sector_id: 's2', sectors: { name: 'Norte' } } },
    ]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getConsumptionBySector()

    expect(result).toEqual([
      { name: 'Centro', value: 150 },
      { name: 'Norte', value: 80 },
    ])
  })

  it('debería agrupar sin sector como "Sin Sector"', async () => {
    const mockData = [
      { consumption: 30, customers: { sector_id: null, sectors: null } },
    ]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getConsumptionBySector()

    expect(result).toEqual([{ name: 'Sin Sector', value: 30 }])
  })

  it('debería filtrar por periodId si se proporciona', async () => {
    let capturedEqField: string | null = null
    let capturedEqValue: any = null

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((f: string, v: any) => { capturedEqField = f; capturedEqValue = v; return chain }),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await service.getConsumptionBySector('p1')

    expect(capturedEqField).toBe('billing_period_id')
    expect(capturedEqValue).toBe('p1')
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: null, error: { message: 'Sectors error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.getConsumptionBySector()).rejects.toThrow('Sectores')
  })
})

describe('DashboardService - getTopDebtors', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ from: mockFrom } as any)
  })

  it('debería obtener top deudores con sector', async () => {
    const mockData = [{ id: 'c1', full_name: 'Juan', current_debt: 500, sectors: { name: 'Centro' } }]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getTopDebtors()

    expect(result[0].sector).toBe('Centro')
  })

  it('debería usar "Sin sector" si no hay sector', async () => {
    const mockData = [{ id: 'c1', full_name: 'Juan', current_debt: 500, sectors: null }]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getTopDebtors()

    expect(result[0].sector).toBe('Sin sector')
  })

  it('debería retornar array vacío si no hay datos', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await service.getTopDebtors()

    expect(result).toEqual([])
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ data: null, error: { message: 'Debtors error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(service.getTopDebtors()).rejects.toThrow('Top deudores')
  })
})
