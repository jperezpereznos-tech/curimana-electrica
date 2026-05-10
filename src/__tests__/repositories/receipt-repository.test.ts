import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReceiptRepository } from '@/repositories/receipt-repository'

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
    order: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('ReceiptRepository - getAllWithDetails', () => {
  let repo: ReceiptRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReceiptRepository()
  })

  it('debería obtener recibos ordenados por receipt_number DESC', async () => {
    const mockData = [
      { id: 'r2', receipt_number: 2, status: 'pending', customers: null, billing_periods: null },
      { id: 'r1', receipt_number: 1, status: 'paid', customers: null, billing_periods: null }
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllWithDetails()

    expect(result).toEqual(mockData)
  })

  it('debería aplicar filtro por periodId', async () => {
    let capturedEqField: string | null = null
    let capturedEqValue: string | null = null

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => {
        capturedEqField = field
        capturedEqValue = value
        return chain
      }),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllWithDetails({ periodId: 'p1' })

    expect(capturedEqField).toBe('billing_period_id')
    expect(capturedEqValue).toBe('p1')
  })

  it('debería aplicar filtro por status', async () => {
    let capturedEqField: string | null = null
    let capturedEqValue: string | null = null

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => {
        capturedEqField = field
        capturedEqValue = value
        return chain
      }),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllWithDetails({ status: 'pending' })

    expect(capturedEqField).toBe('status')
    expect(capturedEqValue).toBe('pending')
  })

  it('debería aplicar filtro por supplyNumber con escape de caracteres especiales', async () => {
    let capturedFilterField: string | null = null
    let capturedFilterOp: string | null = null
    let capturedFilterValue: string | null = null

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn((field: string, op: string, value: string) => {
        capturedFilterField = field
        capturedFilterOp = op
        capturedFilterValue = value
        return chain
      }),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllWithDetails({ supplyNumber: 'SUM%100_test' })

    expect(capturedFilterField).toBe('customers.supply_number')
    expect(capturedFilterOp).toBe('ilike')
    expect(capturedFilterValue).toBe('%SUM\\%100\\_test%')
  })

  it('debería aplicar múltiples filtros simultáneamente', async () => {
    const eqCalls: [string, string][] = []

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => {
        eqCalls.push([field, value])
        return chain
      }),
      order: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllWithDetails({ periodId: 'p1', status: 'pending' })

    expect(eqCalls).toEqual([
      ['billing_period_id', 'p1'],
      ['status', 'pending']
    ])
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return createAwaitableChain({ data: null, error: { message: 'Permission denied', code: '42501' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getAllWithDetails()).rejects.toEqual(expect.objectContaining({ message: 'Permission denied' }))
  })
})

describe('ReceiptRepository - getByIdWithDetails', () => {
  let repo: ReceiptRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ReceiptRepository()
  })

  it('debería obtener recibo con relaciones completas', async () => {
    const mockDetail = {
      id: 'r1',
      receipt_number: 1,
      total_amount: 50,
      customers: {
        id: 'c1',
        full_name: 'Juan Pérez',
        tariffs: { id: 't1', name: 'BTSB', tariff_tiers: [{ min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 }] },
        sectors: { id: 's1', name: 'Centro', code: 'CTR' }
      },
      billing_periods: { id: 'p1', name: 'ENERO 2025' },
      readings: { id: 'rd1', current_reading: 150, previous_reading: 100 }
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return createAwaitableChain({ data: mockDetail, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getByIdWithDetails('r1')

    expect(result).toEqual(mockDetail)
  })

  it('debería lanzar error si el recibo no existe', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'receipts') return createAwaitableChain({ data: null, error: { message: 'No rows found', code: 'PGRST116' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getByIdWithDetails('missing')).rejects.toEqual(expect.objectContaining({ message: 'No rows found' }))
  })
})
