import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentRepository } from '@/repositories/payment-repository'

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
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('PaymentRepository - getByIdWithDetails', () => {
  let repo: PaymentRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new PaymentRepository(mockSupabase)
  })

  it('debería obtener pago con relaciones completas', async () => {
    const mockDetail = {
      id: 'p1',
      amount: 100,
      status: 'completed',
      receipts: {
        receipt_number: 1,
        total_amount: 150,
        paid_amount: 100,
        status: 'partial',
        customers: { full_name: 'Juan Pérez', supply_number: 'SUM-001', address: 'Av. 1', sectors: { id: 's1', name: 'Centro' } },
        billing_periods: { name: 'ENERO 2025' }
      },
      cashier: { full_name: 'Cajero Ana' }
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: mockDetail, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getByIdWithDetails('p1')

    expect(result).toEqual(mockDetail)
  })

  it('debería lanzar error si el pago no existe', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: null, error: { message: 'No rows found', code: 'PGRST116' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getByIdWithDetails('missing')).rejects.toEqual(expect.objectContaining({ message: 'No rows found' }))
  })
})

describe('PaymentRepository - getPaymentsByCashier', () => {
  let repo: PaymentRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new PaymentRepository(mockSupabase)
  })

  it('debería obtener pagos filtrados por cashier_id ordenados por fecha DESC', async () => {
    const mockData = [
      { id: 'p2', cashier_id: 'user1', payment_date: '2025-01-20' },
      { id: 'p1', cashier_id: 'user1', payment_date: '2025-01-15' }
    ]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getPaymentsByCashier('user1')

    expect(result).toEqual(mockData)
  })

  it('debería aplicar filtros de fecha from y to', async () => {
    const eqCalls: [string, string][] = []
    const gteCalls: [string, string][] = []
    const lteCalls: [string, string][] = []

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => { eqCalls.push([field, value]); return chain }),
      gte: vi.fn((field: string, value: string) => { gteCalls.push([field, value]); return chain }),
      lte: vi.fn((field: string, value: string) => { lteCalls.push([field, value]); return chain }),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getPaymentsByCashier('user1', { from: '2025-01-01', to: '2025-01-31' })

    expect(eqCalls).toContainEqual(['cashier_id', 'user1'])
    expect(gteCalls).toContainEqual(['payment_date', '2025-01-01'])
    expect(lteCalls).toContainEqual(['payment_date', '2025-01-31'])
  })

  it('debería funcionar sin filtros de fecha', async () => {
    const eqCalls: [string, string][] = []

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => { eqCalls.push([field, value]); return chain }),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getPaymentsByCashier('user1')

    expect(eqCalls).toContainEqual(['cashier_id', 'user1'])
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: null, error: { message: 'Permission denied' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getPaymentsByCashier('user1')).rejects.toEqual(expect.objectContaining({ message: 'Permission denied' }))
  })
})

describe('PaymentRepository - getAllPayments', () => {
  let repo: PaymentRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new PaymentRepository(mockSupabase)
  })

  it('debería obtener todos los pagos ordenados por fecha DESC', async () => {
    const mockData = [{ id: 'p1' }, { id: 'p2' }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllPayments()

    expect(result).toEqual(mockData)
  })

  it('debería aplicar filtros cashierId, from y to', async () => {
    const eqCalls: [string, string][] = []
    const gteCalls: [string, string][] = []
    const lteCalls: [string, string][] = []

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => { eqCalls.push([field, value]); return chain }),
      gte: vi.fn((field: string, value: string) => { gteCalls.push([field, value]); return chain }),
      lte: vi.fn((field: string, value: string) => { lteCalls.push([field, value]); return chain }),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllPayments({ cashierId: 'user1', from: '2025-01-01', to: '2025-01-31' })

    expect(eqCalls).toContainEqual(['cashier_id', 'user1'])
    expect(gteCalls).toContainEqual(['payment_date', '2025-01-01'])
    expect(lteCalls).toContainEqual(['payment_date', '2025-01-31'])
  })

  it('no debería aplicar eq/gte/lte si los filtros estan vacios', async () => {
    const eqCalls: [string, string][] = []
    const gteCalls: [string, string][] = []
    const lteCalls: [string, string][] = []

    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => { eqCalls.push([field, value]); return chain }),
      gte: vi.fn((field: string, value: string) => { gteCalls.push([field, value]); return chain }),
      lte: vi.fn((field: string, value: string) => { lteCalls.push([field, value]); return chain }),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.getAllPayments({})

    expect(eqCalls).toEqual([])
    expect(gteCalls).toEqual([])
    expect(lteCalls).toEqual([])
  })
})

describe('PaymentRepository - getPaymentsByCustomer', () => {
  let repo: PaymentRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new PaymentRepository(mockSupabase)
  })

  it('debería obtener pagos del cliente excluyendo los anulados', async () => {
    const mockData = [{ id: 'p1', customer_id: 'c1', status: 'completed' }]

    const eqCalls: [string, string][] = []
    const neqCalls: [string, string][] = []

    const promise = Promise.resolve({ data: mockData, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: string) => { eqCalls.push([field, value]); return chain }),
      neq: vi.fn((field: string, value: string) => { neqCalls.push([field, value]); return chain }),
      order: vi.fn().mockReturnThis(),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'payments') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getPaymentsByCustomer('c1')

    expect(eqCalls).toContainEqual(['customer_id', 'c1'])
    expect(neqCalls).toContainEqual(['status', 'voided'])
    expect(result).toEqual(mockData)
  })
})
