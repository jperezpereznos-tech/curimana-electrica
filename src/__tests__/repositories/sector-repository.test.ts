import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SectorRepository } from '@/repositories/sector-repository'

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
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('SectorRepository - getActiveSectors', () => {
  let repo: SectorRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SectorRepository(mockSupabase)
  })

  it('debería obtener sectores activos ordenados por code', async () => {
    const mockSectors = [{ id: 's1', code: 'CTR', is_active: true }]
    let capturedEqField: string | null = null
    let capturedOrderField: string | null = null

    const promise = Promise.resolve({ data: mockSectors, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((f: string) => { capturedEqField = f; return chain }),
      order: vi.fn((f: string) => { capturedOrderField = f; return chain }),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'sectors') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getActiveSectors()

    expect(mockFrom).toHaveBeenCalledWith('sectors')
    expect(capturedEqField).toBe('is_active')
    expect(capturedOrderField).toBe('code')
    expect(result).toEqual(mockSectors)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sectors') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getActiveSectors()).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('SectorRepository - getSectorWithReaders', () => {
  let repo: SectorRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SectorRepository(mockSupabase)
  })

  it('debería obtener sector con lectores asignados', async () => {
    const mockData = { id: 's1', name: 'Centro', profiles: [] }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sectors') return createAwaitableChain({ data: mockData, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getSectorWithReaders('s1')

    expect(result).toEqual(mockData)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sectors') return createAwaitableChain({ data: null, error: { message: 'Not found' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getSectorWithReaders('s1')).rejects.toEqual(expect.objectContaining({ message: 'Not found' }))
  })
})

describe('SectorRepository - getCustomerCount', () => {
  let repo: SectorRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SectorRepository(mockSupabase)
  })

  it('debería obtener conteo de clientes del sector', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ count: 15, error: null })
      return createAwaitableChain({ count: 0, error: null })
    })

    const result = await repo.getCustomerCount('s1')

    expect(result).toBe(15)
  })

  it('debería retornar 0 si count es null', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ count: null, error: null })
      return createAwaitableChain({ count: 0, error: null })
    })

    const result = await repo.getCustomerCount('s1')

    expect(result).toBe(0)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'customers') return createAwaitableChain({ count: null, error: { message: 'DB error' } })
      return createAwaitableChain({ count: 0, error: null })
    })

    await expect(repo.getCustomerCount('s1')).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})
