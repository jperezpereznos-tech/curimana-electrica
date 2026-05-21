import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfileRepository } from '@/repositories/profile-repository'

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
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

describe('ProfileRepository - getAllWithSector', () => {
  let repo: ProfileRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ProfileRepository(mockSupabase)
  })

  it('debería obtener perfiles con sectores ordenados por nombre', async () => {
    const mockUsers = [{ id: 'u1', full_name: 'Admin', sectors: { id: 's1', name: 'Centro', code: 'CTR' } }]
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return createAwaitableChain({ data: mockUsers, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllWithSector()

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(result).toEqual(mockUsers)
  })

  it('debería retornar array vacío si data es null', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return createAwaitableChain({ data: null, error: null })
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getAllWithSector()

    expect(result).toEqual([])
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getAllWithSector()).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('ProfileRepository - getReaders', () => {
  let repo: ProfileRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ProfileRepository(mockSupabase)
  })

  it('debería obtener lectores con role=meter_reader', async () => {
    const mockReaders = [{ id: 'u1', role: 'meter_reader' }]
    let capturedEqField: string | null = null
    let capturedEqValue: any = null

    const promise = Promise.resolve({ data: mockReaders, error: null })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((f: string, v: any) => { capturedEqField = f; capturedEqValue = v; return chain }),
      order: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.getReaders()

    expect(capturedEqField).toBe('role')
    expect(capturedEqValue).toBe('meter_reader')
    expect(result).toEqual(mockReaders)
  })

  it('debería lanzar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return createAwaitableChain({ data: null, error: { message: 'DB error' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.getReaders()).rejects.toEqual(expect.objectContaining({ message: 'DB error' }))
  })
})

describe('ProfileRepository - updateRole', () => {
  let repo: ProfileRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ProfileRepository(mockSupabase)
  })

  it('debería actualizar rol del usuario', async () => {
    const mockResult = { id: 'u1', role: 'admin' }
    let capturedUpdateData: any = null

    const promise = Promise.resolve({ data: mockResult, error: null })
    const chain: any = {
      update: vi.fn((data: any) => { capturedUpdateData = data; return chain }),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.updateRole('u1', 'admin')

    expect(capturedUpdateData).toEqual({ role: 'admin' })
    expect(result).toEqual(mockResult)
  })

  it('debería lanzar error si la actualización falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return createAwaitableChain({ data: null, error: { message: 'Update failed' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.updateRole('u1', 'admin')).rejects.toEqual(expect.objectContaining({ message: 'Update failed' }))
  })
})

describe('ProfileRepository - updateAssignedSector', () => {
  let repo: ProfileRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new ProfileRepository(mockSupabase)
  })

  it('debería actualizar sector asignado del usuario', async () => {
    const mockResult = { id: 'u1', assigned_sector_id: 's1' }
    let capturedUpdateData: any = null

    const promise = Promise.resolve({ data: mockResult, error: null })
    const chain: any = {
      update: vi.fn((data: any) => { capturedUpdateData = data; return chain }),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await repo.updateAssignedSector('u1', 's1')

    expect(capturedUpdateData).toEqual({ assigned_sector_id: 's1' })
    expect(result).toEqual(mockResult)
  })

  it('debería desasignar sector con null', async () => {
    let capturedUpdateData: any = null

    const promise = Promise.resolve({ data: { id: 'u1', assigned_sector_id: null }, error: null })
    const chain: any = {
      update: vi.fn((data: any) => { capturedUpdateData = data; return chain }),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnValue(promise),
      then: promise.then.bind(promise),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return chain
      return createAwaitableChain({ data: null, error: null })
    })

    await repo.updateAssignedSector('u1', null)

    expect(capturedUpdateData).toEqual({ assigned_sector_id: null })
  })

  it('debería lanzar error si la actualización falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return createAwaitableChain({ data: null, error: { message: 'Update failed' } })
      return createAwaitableChain({ data: null, error: null })
    })

    await expect(repo.updateAssignedSector('u1', 's1')).rejects.toEqual(expect.objectContaining({ message: 'Update failed' }))
  })
})
