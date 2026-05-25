import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeriodRepository } from '@/repositories/period-repository'

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

const mockSupabase = {
  from: mockFrom,
  rpc: vi.fn().mockReturnValue({ data: null, error: null }),
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
} as any

function createAwaitableChain(resolvedValue: any) {
  const promise = Promise.resolve(resolvedValue)
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('PeriodRepository - getCurrentPeriod', () => {
  let repo: PeriodRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new PeriodRepository(mockSupabase)
  })

  it('debería obtener el periodo abierto más reciente', async () => {
    const mockPeriod = { id: 'p1', year: 2025, month: 6, is_closed: false }
    let capturedEq: [string, boolean] | null = null

    const promise = Promise.resolve({ data: mockPeriod, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: boolean) => {
        capturedEq = [field, value]
        return chain
      }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getCurrentPeriod()

    expect(result).toEqual(mockPeriod)
    expect(capturedEq).toEqual(['is_closed', false])
  })

  it('debería retornar null si no hay periodo abierto', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getCurrentPeriod()

    expect(result).toBeNull()
  })

  it('debería retornar null para error PGRST116 (no rows)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: { message: 'No rows', code: 'PGRST116' } })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getCurrentPeriod()

    expect(result).toBeNull()
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: { message: 'DB error', code: '500' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getCurrentPeriod()).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('PeriodRepository - getAllPeriods', () => {
  let repo: PeriodRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new PeriodRepository(mockSupabase)
  })

  it('debería obtener todos los periodos ordenados por year y month DESC', async () => {
    const mockPeriods = [
      { id: 'p2', year: 2025, month: 6, is_closed: true },
      { id: 'p1', year: 2025, month: 5, is_closed: false }
    ]
    const orderCalls: [string, { ascending: boolean }][] = []

    const promise = Promise.resolve({ data: mockPeriods, error: null })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn((field: string, opts: { ascending: boolean }) => {
      orderCalls.push([field, opts])
      return chain
    }),
    limit: vi.fn().mockReturnThis(),
    then: promise.then.bind(promise),
  }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllPeriods()

    expect(result).toEqual(mockPeriods)
    expect(orderCalls).toEqual([
      ['year', { ascending: false }],
      ['month', { ascending: false }]
    ])
  })

  it('debería retornar array vacío si no hay periodos', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllPeriods()

    expect(result).toEqual([])
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_periods') return createAwaitableChain({ data: null, error: { message: 'Connection lost' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getAllPeriods()).rejects.toEqual(expect.objectContaining({ message: 'Connection lost' }))
  })
})
