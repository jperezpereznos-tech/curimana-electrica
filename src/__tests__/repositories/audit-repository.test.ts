import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditRepository } from '@/repositories/audit-repository'

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
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    maybeSingle: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('AuditRepository - getAllLogs', () => {
  let repo: AuditRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new AuditRepository()
  })

  it('debería obtener logs ordenados por created_at DESC con límite 500', async () => {
    const mockLogs = [
      { id: 'a2', created_at: '2025-06-02', action: 'UPDATE' },
      { id: 'a1', created_at: '2025-06-01', action: 'INSERT' }
    ]
    let capturedOrderField: string | null = null
    let capturedOrderOpts: any = null
    let capturedLimit: number | null = null

    const promise = Promise.resolve({ data: mockLogs, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn((field: string, opts: any) => {
        capturedOrderField = field
        capturedOrderOpts = opts
        return chain
      }),
      limit: vi.fn((n: number) => {
        capturedLimit = n
        return chain
      }),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllLogs()

    expect(result).toEqual(mockLogs)
    expect(capturedOrderField).toBe('created_at')
    expect(capturedOrderOpts).toEqual({ ascending: false })
    expect(capturedLimit).toBe(500)
  })

  it('debería retornar null si no hay logs', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllLogs()

    expect(result).toBeNull()
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'audit_logs') return createAwaitableChain({ data: null, error: { message: 'RLS violation' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getAllLogs()).rejects.toEqual(expect.objectContaining({ message: 'RLS violation' }))
  })
})
