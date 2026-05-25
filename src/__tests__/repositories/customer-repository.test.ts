import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerRepository } from '@/repositories/customer-repository'

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
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    maybeSingle: vi.fn().mockReturnValue(promise),
    gt: vi.fn().mockReturnThis(),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('CustomerRepository - searchCustomers', () => {
  let repo: CustomerRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CustomerRepository(mockSupabase)
  })

  it('debería buscar clientes sin sectorId', async () => {
    let capturedOr: string | null = null
    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn((q: string) => { capturedOr = q; return chain }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.searchCustomers('Juan')

    expect(mockFrom).toHaveBeenCalledWith('customers')
    expect(capturedOr).toContain('full_name.ilike')
  })

  it('debería filtrar por sectorId cuando se proporciona', async () => {
    let capturedEqField: string | null = null
    let capturedEqValue: any = null
    const promise = Promise.resolve({ data: [], error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((f: string, v: any) => { capturedEqField = f; capturedEqValue = v; return chain }),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.searchCustomers('Juan', 's1')

    expect(capturedEqField).toBe('sector_id')
    expect(capturedEqValue).toBe('s1')
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.searchCustomers('Juan')).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('CustomerRepository - getBySupplyNumber', () => {
  let repo: CustomerRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CustomerRepository(mockSupabase)
  })

  it('debería buscar cliente por supply_number exacto con maybeSingle', async () => {
    const mockCustomer = { id: 'c1', supply_number: '608132421', full_name: 'Juan', readings: [] }
    let capturedEqField: string | null = null
    let capturedEqValue: string | null = null
    let usedMaybeSingle = false

    const promise = Promise.resolve({ data: mockCustomer, error: null })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((field: string, value: string) => {
      capturedEqField = field
      capturedEqValue = value
      return chain
    }),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => {
      usedMaybeSingle = true
      return promise
    }),
  }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getBySupplyNumber('608132421')

    expect(capturedEqField).toBe('supply_number')
    expect(capturedEqValue).toBe('608132421')
    expect(usedMaybeSingle).toBe(true)
    expect(result).not.toBeNull()
  })

  it('debería retornar null si no existe cliente con ese supply_number', async () => {
  const promise = Promise.resolve({ data: null, error: null })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue(promise),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'customers') return chain
    return createAwaitableChain({ data: null, error: null })
  })

  const result = await repo.getBySupplyNumber('999999999')

    expect(result).toBeNull()
  })

  it('debería lanzar error si la consulta falla', async () => {
    const promise = Promise.resolve({ data: null, error: { message: 'DB error' } })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue(promise),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'customers') return chain
    return createAwaitableChain({ data: null, error: null })
  })

  await expect(repo.getBySupplyNumber('608132421')).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('CustomerRepository - getTopDebtors', () => {
  let repo: CustomerRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CustomerRepository(mockSupabase)
  })

  it('debería obtener deudores con is_active=true y debt>0', async () => {
    const mockDebtors = [{ id: 'c1', current_debt: 500 }]
  const capturedEq: Record<string, any> = {}
  const capturedGt: Record<string, any> = {}

    const promise = Promise.resolve({ data: mockDebtors, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((f: string, v: any) => { capturedEq[f] = v; return chain }),
      gt: vi.fn((f: string, v: any) => { capturedGt[f] = v; return chain }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getTopDebtors(5)

    expect(capturedEq['is_active']).toBe(true)
    expect(capturedGt['current_debt']).toBe(0)
    expect(result).toEqual(mockDebtors)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getTopDebtors()).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('CustomerRepository - getActiveCustomersWithReadings', () => {
  let repo: CustomerRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CustomerRepository(mockSupabase)
  })

  it('debería obtener clientes activos', async () => {
    const mockCustomers = [{ id: 'c1' }]
    let capturedEqField: string | null = null

    const promise = Promise.resolve({ data: mockCustomers, error: null })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((f: string) => { capturedEqField = f; return chain }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: promise.then.bind(promise),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'customers') return chain
    return createAwaitableChain({ data: null, error: null })
  })

  const result = await repo.getActiveCustomersWithReadings()

    expect(capturedEqField).toBe('is_active')
    expect(result).toEqual(mockCustomers)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getActiveCustomersWithReadings()).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('CustomerRepository - getAllForCache', () => {
  let repo: CustomerRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new CustomerRepository(mockSupabase)
  })

  it('debería obtener clientes para caché con previous_reading', async () => {
    const mockData = [{ id: 'c1', supply_number: '123', full_name: 'Juan', address: 'Calle 1', sector_id: 's1', tariff_id: 't1', is_active: true, readings: [{ current_reading: 100, reading_date: '2025-06-01' }], sectors: { name: 'Centro' } }]

    const promise = Promise.resolve({ data: mockData, error: null })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'customers') return chain
    return createAwaitableChain({ data: null, error: null })
  })

  const result = await repo.getAllForCache()

    expect(result[0].previous_reading).toBe(100)
    expect(result[0].sectorName).toBe('Centro')
  })
})
