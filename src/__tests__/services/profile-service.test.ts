import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfileService } from '@/services/profile-service'
import { ProfileRepository } from '@/repositories/profile-repository'

vi.mock('@/repositories/profile-repository')

const mockInviteUserByEmail = vi.fn()
const mockDeleteUser = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        inviteUserByEmail: mockInviteUserByEmail,
        deleteUser: mockDeleteUser,
      }
    }
  })
}))

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
  }),
  rpc: vi.fn().mockReturnValue({ data: null, error: null }),
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
		},
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
    }),
  },
} as any

describe('ProfileService - getAllUsers', () => {
  const service = new ProfileService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks() })

  it('debería delegar al repositorio', async () => {
    const mockUsers = [{ id: 'u1', full_name: 'Admin' }]
    vi.spyOn(ProfileRepository.prototype, 'getAllWithSector').mockResolvedValue(mockUsers as any)

    const result = await service.getAllUsers()

    expect(ProfileRepository.prototype.getAllWithSector).toHaveBeenCalled()
    expect(result).toEqual(mockUsers)
  })
})

describe('ProfileService - getReaders', () => {
  const service = new ProfileService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks() })

  it('debería delegar al repositorio', async () => {
    const mockReaders = [{ id: 'u1', role: 'meter_reader' }]
    vi.spyOn(ProfileRepository.prototype, 'getReaders').mockResolvedValue(mockReaders as any)

    const result = await service.getReaders()

    expect(ProfileRepository.prototype.getReaders).toHaveBeenCalled()
    expect(result).toEqual(mockReaders)
  })
})

describe('ProfileService - updateRole', () => {
  const service = new ProfileService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks() })

  it('debería actualizar rol a través del repositorio', async () => {
    const mockResult = { id: 'u1', role: 'admin' }
    vi.spyOn(ProfileRepository.prototype, 'updateRole').mockResolvedValue(mockResult as any)

    const result = await service.updateRole('u1', 'admin')

    expect(ProfileRepository.prototype.updateRole).toHaveBeenCalledWith('u1', 'admin')
    expect(result).toEqual(mockResult)
  })
})

describe('ProfileService - assignSector', () => {
  const service = new ProfileService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks() })

  it('debería asignar sector a través del repositorio', async () => {
    const mockResult = { id: 'u1', assigned_sector_id: 's1' }
    vi.spyOn(ProfileRepository.prototype, 'updateAssignedSector').mockResolvedValue(mockResult as any)

    const result = await service.assignSector('u1', 's1')

    expect(ProfileRepository.prototype.updateAssignedSector).toHaveBeenCalledWith('u1', 's1')
    expect(result).toEqual(mockResult)
  })

  it('debería desasignar sector con null', async () => {
    vi.spyOn(ProfileRepository.prototype, 'updateAssignedSector').mockResolvedValue({ id: 'u1' } as any)

    await service.assignSector('u1', null)

    expect(ProfileRepository.prototype.updateAssignedSector).toHaveBeenCalledWith('u1', null)
  })
})

describe('ProfileService - inviteUser', () => {
  const service = new ProfileService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks() })

  it('debería invitar usuario usando admin client', async () => {
    mockInviteUserByEmail.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } }, error: null })

    const result = await service.inviteUser('test@test.com', 'password', 'Juan')

    expect(mockInviteUserByEmail).toHaveBeenCalledWith('test@test.com', expect.objectContaining({ data: { full_name: 'Juan' } }))
    expect(result.user).toEqual({ id: 'u1', email: 'test@test.com' })
  })

  it('debería retornar user null si no hay data', async () => {
    mockInviteUserByEmail.mockResolvedValue({ data: { user: null }, error: null })

    const result = await service.inviteUser('test@test.com', 'password', 'Juan')

    expect(result.user).toBeNull()
  })

  it('debería propagar error si inviteUserByEmail falla', async () => {
    mockInviteUserByEmail.mockResolvedValue({ data: {}, error: { message: 'Email already registered' } })

    await expect(service.inviteUser('test@test.com', 'password', 'Juan')).rejects.toEqual(expect.objectContaining({ message: 'Email already registered' }))
  })
})

describe('ProfileService - deleteUser', () => {
  const service = new ProfileService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks() })

  it('debería eliminar usuario usando admin client', async () => {
    mockDeleteUser.mockResolvedValue({ error: null })

    await service.deleteUser('u1')

    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
  })

  it('debería propagar error si deleteUser falla', async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: 'Not found' } })

    await expect(service.deleteUser('u1')).rejects.toEqual(expect.objectContaining({ message: 'Not found' }))
  })
})
