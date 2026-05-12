import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CashClosureRepository } from '@/repositories/cash-closure-repository'

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
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('CashClosureRepository - getActiveClosure', () => {
  let repo: CashClosureRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CashClosureRepository()
  })

  it('debería obtener la caja abierta del cajero', async () => {
    const mockClosure = { id: 'cl1', cashier_id: 'user1', status: 'open' }
    const eqCalls: [string, any][] = []

    const promise = Promise.resolve({ data: mockClosure, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: any) => {
        eqCalls.push([field, value])
        return chain
      }),
      maybeSingle: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'cash_closures') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getActiveClosure('user1')

    expect(result).toEqual(mockClosure)
    expect(eqCalls).toEqual([['cashier_id', 'user1'], ['status', 'open']])
  })

  it('debería retornar null si no hay caja abierta', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cash_closures') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getActiveClosure('user1')

    expect(result).toBeNull()
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cash_closures') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getActiveClosure('user1')).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('CashClosureRepository - getSessionTotal', () => {
  let repo: CashClosureRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CashClosureRepository()
  })

  it('debería calcular total y conteo de pagos no voided', async () => {
    const mockPayments = [
      { amount: 50.50 },
      { amount: 30.25 },
      { amount: 20.25 }
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: mockPayments, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getSessionTotal('user1', '2025-06-01T00:00:00Z')

    expect(result.total).toBe(101)
    expect(result.count).toBe(3)
  })

  it('debería retornar total 0 y count 0 si no hay pagos', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getSessionTotal('user1', '2025-06-01T00:00:00Z')

    expect(result.total).toBe(0)
    expect(result.count).toBe(0)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: null, error: { message: 'Query failed' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getSessionTotal('user1', '2025-06-01T00:00:00Z')).rejects.toEqual(expect.objectContaining({ message: 'Query failed' }))
  })
})

describe('CashClosureRepository - close', () => {
  let repo: CashClosureRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CashClosureRepository()
  })

  it('debería actualizar el cierre con status closed', async () => {
    const mockResult = { id: 'cl1', status: 'closed', total_collected: 100 }
    let capturedUpdate: any = null

    const promise = Promise.resolve({ data: mockResult, error: null })
    const chain: any = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'cash_closures') {
        return {
          update: vi.fn((payload: any) => {
            capturedUpdate = payload
            return chain
          })
        }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.close('cl1', { closed_at: '2025-06-01T12:00:00Z', total_collected: 100, total_receipts: 2 })

    expect(capturedUpdate).toEqual(expect.objectContaining({
      status: 'closed',
      total_collected: 100,
      total_receipts: 2
    }))
    expect(result).toEqual(mockResult)
  })

  it('debería lanzar error si el update falla', async () => {
    const promise = Promise.resolve({ data: null, error: { message: 'Update failed' } })
    const chain: any = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'cash_closures') {
        return {
          update: vi.fn().mockReturnValue(chain)
        }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.close('cl1', { closed_at: '2025-06-01T12:00:00Z', total_collected: 0, total_receipts: 0 }))
      .rejects.toEqual(expect.objectContaining({ message: 'Update failed' }))
  })
})
