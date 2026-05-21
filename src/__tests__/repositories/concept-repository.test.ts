import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConceptRepository } from '@/repositories/concept-repository'

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
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('ConceptRepository - getAllActive', () => {
  let repo: ConceptRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ConceptRepository(mockSupabase)
  })

  it('debería obtener conceptos activos ordenados por nombre', async () => {
    const mockData = [
      { id: 'c1', name: 'Alumbrado', is_active: true },
      { id: 'c2', name: 'Cargo Fijo', is_active: true }
    ]
    let capturedEqField: string | null = null
    let capturedEqValue: any = null
    let capturedOrderField: string | null = null

    const promise = Promise.resolve({ data: mockData, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((field: string, value: any) => {
        capturedEqField = field
        capturedEqValue = value
        return chain
      }),
      order: vi.fn((field: string) => {
        capturedOrderField = field
        return chain
      }),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_concepts') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllActive()

    expect(result).toEqual(mockData)
    expect(capturedEqField).toBe('is_active')
    expect(capturedEqValue).toBe(true)
    expect(capturedOrderField).toBe('name')
  })

  it('debería retornar null si no hay conceptos activos', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_concepts') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllActive()

    expect(result).toBeNull()
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'billing_concepts') return createAwaitableChain({ data: null, error: { message: 'Permission denied' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getAllActive()).rejects.toEqual(expect.objectContaining({ message: 'Permission denied' }))
  })
})
