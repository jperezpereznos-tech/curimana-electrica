import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardService } from '@/services/dashboard-service'

const { mockRpc } = vi.hoisted(() => {
  const rpcFn = vi.fn()
  return { mockRpc: rpcFn }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: vi.fn(),
    auth: { getUser: vi.fn() }
  })
}))

describe('DashboardService - getDashboardData', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ rpc: mockRpc, from: vi.fn() } as any)
  })

  it('debería obtener todos los datos del dashboard via RPC', async () => {
    mockRpc.mockResolvedValue({
      data: {
        total_collected: 300,
        total_debt: 800,
        active_customers: 10,
        pending_receipts: 5,
        revenue_history: [{ name: 'JUNIO 2025', total: 100 }, { name: 'MAYO 2025', total: 200 }],
        sector_consumption: [{ name: 'Centro', value: 150 }, { name: 'Norte', value: 80 }],
      },
      error: null,
    })

    const result = await service.getDashboardData()

    expect(result.kpis).toEqual({
      totalCollected: 300,
      totalDebt: 800,
      activeCustomers: 10,
      pendingReceipts: 5,
    })
    expect(result.revenueHistory).toEqual([
      { name: 'JUNIO 2025', total: 100 },
      { name: 'MAYO 2025', total: 200 },
    ])
    expect(result.sectorData).toEqual([
      { name: 'Centro', value: 150 },
      { name: 'Norte', value: 80 },
    ])
  })

  it('debería manejar null data del RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })

    const result = await service.getDashboardData()

    expect(result.kpis).toEqual({
      totalCollected: 0,
      totalDebt: 0,
      activeCustomers: 0,
      pendingReceipts: 0,
    })
    expect(result.revenueHistory).toEqual([])
    expect(result.sectorData).toEqual([])
  })

  it('debería lanzar error si el RPC falla', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })

    await expect(service.getDashboardData()).rejects.toThrow('Dashboard RPC')
  })
})

describe('DashboardService - getSummaryKPIs', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ rpc: mockRpc, from: vi.fn() } as any)
  })

  it('debería delegar a getDashboardData', async () => {
    mockRpc.mockResolvedValue({
      data: {
        total_collected: 100,
        total_debt: 200,
        active_customers: 5,
        pending_receipts: 3,
        revenue_history: [],
        sector_consumption: [],
      },
      error: null,
    })

    const result = await service.getSummaryKPIs()

    expect(result).toEqual({
      totalCollected: 100,
      totalDebt: 200,
      activeCustomers: 5,
      pendingReceipts: 3,
    })
  })
})

describe('DashboardService - getRevenueHistory', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ rpc: mockRpc, from: vi.fn() } as any)
  })

  it('debería delegar a getDashboardData', async () => {
    mockRpc.mockResolvedValue({
      data: {
        total_collected: 0,
        total_debt: 0,
        active_customers: 0,
        pending_receipts: 0,
        revenue_history: [{ name: 'ENERO 2025', total: 500 }],
        sector_consumption: [],
      },
      error: null,
    })

    const result = await service.getRevenueHistory()

    expect(result).toEqual([{ name: 'ENERO 2025', total: 500 }])
  })
})

describe('DashboardService - getConsumptionBySector', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ rpc: mockRpc, from: vi.fn() } as any)
  })

  it('debería delegar a getDashboardData', async () => {
    mockRpc.mockResolvedValue({
      data: {
        total_collected: 0,
        total_debt: 0,
        active_customers: 0,
        pending_receipts: 0,
        revenue_history: [],
        sector_consumption: [{ name: 'Centro', value: 100 }],
      },
      error: null,
    })

    const result = await service.getConsumptionBySector()

    expect(result).toEqual([{ name: 'Centro', value: 100 }])
  })
})

const { mockFrom } = vi.hoisted(() => {
  const mockFromFn = vi.fn()
  return { mockFrom: mockFromFn }
})

function createAwaitableChain(resolvedValue: any) {
  const promise = Promise.resolve(resolvedValue)
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('DashboardService - getTopDebtors', () => {
  let service: DashboardService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new DashboardService({ from: mockFrom, rpc: vi.fn() } as any)
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
