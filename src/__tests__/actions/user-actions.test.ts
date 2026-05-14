import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetAllUsers = vi.fn()
const mockUpdateRole = vi.fn()
const mockAssignSector = vi.fn()
const mockInviteUser = vi.fn()
const mockDeleteUser = vi.fn()

vi.mock('@/services/profile-service', () => ({
  ProfileService: vi.fn().mockImplementation(() => ({
    getAllUsers: mockGetAllUsers,
    updateRole: mockUpdateRole,
    assignSector: mockAssignSector,
    inviteUser: mockInviteUser,
    deleteUser: mockDeleteUser,
  })),
  getProfileService: vi.fn().mockReturnValue({
    getAllUsers: mockGetAllUsers,
    updateRole: mockUpdateRole,
    assignSector: mockAssignSector,
    inviteUser: mockInviteUser,
    deleteUser: mockDeleteUser,
  })
}))

const mockGetActiveSectors = vi.fn()
vi.mock('@/services/sector-service', () => ({
  SectorService: vi.fn().mockImplementation(() => ({
    getActiveSectors: mockGetActiveSectors,
  })),
  getSectorService: vi.fn().mockReturnValue({
    getActiveSectors: mockGetActiveSectors,
  })
}))

const mockRequireAdminAuth = vi.fn()
vi.mock('@/lib/auth/server-admin-auth', () => ({
  requireAdminAuth: () => mockRequireAdminAuth()
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const mockGetClaims = vi.fn()
const mockSupabaseInstance = {
  from: vi.fn(),
  auth: { getUser: vi.fn(), getClaims: mockGetClaims },
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseInstance)
}))

const {
  getUsersWithRolesAction,
  updateUserRoleAction,
  assignSectorToUserAction,
  inviteUserAction,
  deleteUserAction,
} = await import('@/app/admin/users/actions')

describe('getUsersWithRolesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería obtener usuarios y sectores en paralelo', async () => {
    const mockUsers = [{ id: '00000000-0000-4000-8100-000000000001', full_name: 'Admin' }]
    const mockSectors = [{ id: '00000000-0000-4000-8100-000000000010', name: 'Centro' }]
    mockGetAllUsers.mockResolvedValue(mockUsers)
    mockGetActiveSectors.mockResolvedValue(mockSectors)

    const result = await getUsersWithRolesAction()

    expect(result).toEqual({ users: mockUsers, sectors: mockSectors })
  })
})

describe('updateUserRoleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería actualizar rol y revalidar ruta', async () => {
    mockUpdateRole.mockResolvedValue({ id: '00000000-0000-4000-8100-000000000001', role: 'admin' })

    const result = await updateUserRoleAction('00000000-0000-4000-8100-000000000001', 'admin')

    expect(mockUpdateRole).toHaveBeenCalledWith('00000000-0000-4000-8100-000000000001', 'admin')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateUserRoleAction('00000000-0000-4000-8100-000000000001', 'admin')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockUpdateRole.mockRejectedValue(new Error('Update failed'))

    const result = await updateUserRoleAction('00000000-0000-4000-8100-000000000001', 'admin')

    expect(result).toEqual({ success: false, error: 'Update failed' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateRole.mockRejectedValue('fail')

    const result = await updateUserRoleAction('00000000-0000-4000-8100-000000000001', 'admin')

    expect(result).toEqual({ success: false, error: 'Error al cambiar rol' })
  })
})

describe('assignSectorToUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería asignar sector y revalidar ambas rutas', async () => {
    mockAssignSector.mockResolvedValue({ id: '00000000-0000-4000-8100-000000000001' })

    const result = await assignSectorToUserAction('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8100-000000000010')

    expect(mockAssignSector).toHaveBeenCalledWith('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8100-000000000010')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/sectors')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await assignSectorToUserAction('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockAssignSector.mockRejectedValue(new Error('Not found'))

    const result = await assignSectorToUserAction('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'Not found' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockAssignSector.mockRejectedValue(null)

    const result = await assignSectorToUserAction('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'Error al asignar sector' })
  })
})

describe('inviteUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debería invitar usuario y revalidar ruta', async () => {
    mockInviteUser.mockResolvedValue({ user: { id: '00000000-0000-4000-8100-000000000001', email: 'test@test.com' } })
    mockUpdateRole.mockResolvedValue({ id: '00000000-0000-4000-8100-000000000001', role: 'cashier' })
    mockAssignSector.mockResolvedValue({ id: '00000000-0000-4000-8100-000000000001' })

    const result = await inviteUserAction('test@test.com', 'Juan', 'cashier', '00000000-0000-4000-8100-000000000010')

    expect(mockInviteUser).toHaveBeenCalledWith('test@test.com', '', 'Juan')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si no se pudo crear el usuario', async () => {
    mockInviteUser.mockResolvedValue({ user: null })

    const result = await inviteUserAction('test@test.com', 'Juan', 'admin')

    expect(result).toEqual({ success: false, error: 'No se pudo crear el usuario' })
  })

  it('debería omitir updateRole para meter_reader', async () => {
    mockInviteUser.mockResolvedValue({ user: { id: '00000000-0000-4000-8100-000000000001', email: 'test@test.com' } })

    const result = await inviteUserAction('test@test.com', 'Lector', 'meter_reader')

    expect(mockUpdateRole).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await inviteUserAction('test@test.com', 'Juan', 'admin')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockInviteUser.mockRejectedValue('fail')

    const result = await inviteUserAction('test@test.com', 'Juan', 'admin')

    expect(result).toEqual({ success: false, error: 'Error al invitar usuario' })
  })
})

describe('deleteUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería eliminar usuario y revalidar ruta', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: '00000000-0000-4000-8200-000000000002' } } })
    mockDeleteUser.mockResolvedValue(undefined)

    const result = await deleteUserAction('00000000-0000-4000-8100-000000000001')

    expect(mockDeleteUser).toHaveBeenCalledWith('00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(result).toEqual({ success: true })
  })

  it('debería rechazar eliminación de propia cuenta', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: '00000000-0000-4000-8100-000000000001' } } })

    const result = await deleteUserAction('00000000-0000-4000-8100-000000000001')

    expect(result).toEqual({ success: false, error: 'No puedes eliminar tu propia cuenta' })
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await deleteUserAction('00000000-0000-4000-8100-000000000001')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: '00000000-0000-4000-8200-000000000002' } } })
    mockDeleteUser.mockRejectedValue(new Error('Not found'))

    const result = await deleteUserAction('00000000-0000-4000-8100-000000000001')

    expect(result).toEqual({ success: false, error: 'Not found' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: '00000000-0000-4000-8200-000000000002' } } })
    mockDeleteUser.mockRejectedValue('fail')

    const result = await deleteUserAction('00000000-0000-4000-8100-000000000001')

    expect(result).toEqual({ success: false, error: 'Error al eliminar usuario' })
  })
})
