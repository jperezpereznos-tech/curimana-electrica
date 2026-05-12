import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReadingRepository } from '@/repositories/reading-repository'

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
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('ReadingRepository - getLatestReadingByCustomer', () => {
  let repo: ReadingRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReadingRepository()
  })

  it('debería obtener la lectura más reciente del cliente', async () => {
    const mockReading = { id: 'rd1', customer_id: 'c1', consumption: 50 }
    const eqCalls: [string, any][] = []
    const orderCalls: [string, any][] = []

    const promise = Promise.resolve({ data: mockReading, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: any) => { eqCalls.push([field, value]); return chain }),
      order: vi.fn((field: string, opts: any) => { orderCalls.push([field, opts]); return chain }),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getLatestReadingByCustomer('c1')

    expect(result).toEqual(mockReading)
    expect(eqCalls[0]).toEqual(['customer_id', 'c1'])
    expect(orderCalls[0]).toEqual(['reading_date', { ascending: false }])
  })

  it('debería retornar null si no hay lecturas', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getLatestReadingByCustomer('c1')

    expect(result).toBeNull()
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getLatestReadingByCustomer('c1')).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('ReadingRepository - getReadingsByPeriod', () => {
  let repo: ReadingRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReadingRepository()
  })

  it('debería obtener lecturas del periodo con datos de cliente', async () => {
    const mockReadings = [{ id: 'rd1', customer_id: 'c1', customers: { full_name: 'Juan', supply_number: 'SUM-001' } }]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: mockReadings, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getReadingsByPeriod('p1')

    expect(result).toEqual(mockReadings)
  })
})

describe('ReadingRepository - getAllForAdmin', () => {
  let repo: ReadingRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReadingRepository()
  })

  it('debería obtener todas las lecturas sin filtros', async () => {
    const mockReadings = [{ id: 'rd1' }]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: mockReadings, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllForAdmin()

    expect(result).toEqual(mockReadings)
  })

  it('debería aplicar filtro por periodId', async () => {
    const eqCalls: [string, any][] = []

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: any) => { eqCalls.push([field, value]); return chain }),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllForAdmin('p1')

    expect(eqCalls).toContainEqual(['billing_period_id', 'p1'])
  })

  it('debería aplicar filtro needsReviewOnly', async () => {
    const eqCalls: [string, any][] = []

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: any) => { eqCalls.push([field, value]); return chain }),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllForAdmin(undefined, true)

    expect(eqCalls).toContainEqual(['needs_review', true])
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ data: null, error: { message: 'Failed' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getAllForAdmin()).rejects.toEqual(expect.objectContaining({ message: 'Failed' }))
  })
})

describe('ReadingRepository - getTodayReadingsCount', () => {
  let repo: ReadingRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReadingRepository()
  })

  it('debería retornar conteo de lecturas de hoy', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ count: 7, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getTodayReadingsCount()

    expect(result).toBe(7)
  })

  it('debería retornar 0 si no hay lecturas', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ count: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getTodayReadingsCount()

    expect(result).toBe(0)
  })
})

describe('ReadingRepository - getReviewCount', () => {
  let repo: ReadingRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReadingRepository()
  })

  it('debería retornar conteo de lecturas que necesitan revisión', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'readings') return createAwaitableChain({ count: 3, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getReviewCount()

    expect(result).toBe(3)
  })
})

describe('ReadingRepository - getActiveCustomersCount', () => {
  let repo: ReadingRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReadingRepository()
  })

  it('debería retornar conteo de clientes activos sin sector', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ count: 150, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getActiveCustomersCount()

    expect(result).toBe(150)
  })

  it('debería filtrar por sectorId', async () => {
    const eqCalls: [string, any][] = []

    const promise = Promise.resolve({ count: 50, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: any) => { eqCalls.push([field, value]); return chain }),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getActiveCustomersCount('s1')

    expect(result).toBe(50)
    expect(eqCalls).toContainEqual(['sector_id', 's1'])
  })
})
