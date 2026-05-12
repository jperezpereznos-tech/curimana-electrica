import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TariffRepository } from '@/repositories/tariff-repository'

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
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('TariffRepository - getAllWithTiers', () => {
  let repo: TariffRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new TariffRepository()
  })

  it('debería obtener tarifas con tramos ordenados DESC', async () => {
    const mockData = [{ id: 't1', name: 'BTSB', tariff_tiers: [] }]
    let capturedOrderField: string | null = null
    let capturedOrderOpts: any = null

    const promise = Promise.resolve({ data: mockData, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn((f: string, opts: any) => { capturedOrderField = f; capturedOrderOpts = opts; return chain }),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tariffs') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllWithTiers()

    expect(mockFrom).toHaveBeenCalledWith('tariffs')
    expect(capturedOrderField).toBe('created_at')
    expect(capturedOrderOpts).toEqual({ ascending: false })
    expect(result).toEqual(mockData)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tariffs') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getAllWithTiers()).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('TariffRepository - createTariffWithTiers', () => {
  let repo: TariffRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new TariffRepository()
  })

  it('debería crear tarifa y luego insertar tramos', async () => {
    const newTariff = { id: 't1', name: 'BTSB' }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'tariffs') {
        const promise = Promise.resolve({ data: newTariff, error: null })
        const chain: any = {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnValue(promise),
          then: promise.then.bind(promise),
        }
        return chain
      }
      if (table === 'tariff_tiers') {
        return createAwaitableChain({ error: null })
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.createTariffWithTiers(
      { name: 'BTSB', is_active: true } as any,
      [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1, order_index: 1 }]
    )

    expect(result).toEqual(newTariff)
  })

  it('debería lanzar error si la creación de tarifa falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'tariffs') return createAwaitableChain({ data: null, error: { message: 'Insert failed' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.createTariffWithTiers({ name: 'BTSB' } as any, [])).rejects.toEqual(expect.objectContaining({ message: 'Insert failed' }))
  })
})
