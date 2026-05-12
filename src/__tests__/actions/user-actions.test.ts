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
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'admin1' })
  })

  it('debería obtener usuarios y sectores en paralelo', async () => {
    const mockUsers = [{ id: 'u1', full_name: 'Admin' }]
    const mockSectors = [{ id: 's1', name: 'Centro' }]
    mockGetAllUsers.mockResolvedValue(mockUsers)
    mockGetActiveSectors.mockResolvedValue(mockSectors)

    const result = await getUsersWithRolesAction()

    expect(result).toEqual({ users: mockUsers, sectors: mockSectors })
  })
})

describe('updateUserRoleAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'admin1' })
  })

  it('debería actualizar rol y revalidar ruta', async () => {
    mockUpdateRole.mockResolvedValue({ id: 'u1', role: 'admin' })

    const result = await updateUserRoleAction('u1', 'admin')

    expect(mockUpdateRole).toHaveBeenCalledWith('u1', 'admin')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateUserRoleAction('u1', 'admin')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockUpdateRole.mockRejectedValue(new Error('Update failed'))

    const result = await updateUserRoleAction('u1', 'admin')

    expect(result).toEqual({ success: false, error: 'Update failed' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateRole.mockRejectedValue('fail')

    const result = await updateUserRoleAction('u1', 'admin')

    expect(result).toEqual({ success: false, error: 'Error al cambiar rol' })
  })
})

describe('assignSectorToUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'admin1' })
  })

  it('debería asignar sector y revalidar ambas rutas', async () => {
    mockAssignSector.mockResolvedValue({ id: 'u1' })

    const result = await assignSectorToUserAction('u1', 's1')

    expect(mockAssignSector).toHaveBeenCalledWith('u1', 's1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/sectors')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await assignSectorToUserAction('u1', 's1')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockAssignSector.mockRejectedValue(new Error('Not found'))

    const result = await assignSectorToUserAction('u1', 's1')

    expect(result).toEqual({ success: false, error: 'Not found' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockAssignSector.mockRejectedValue(null)

    const result = await assignSectorToUserAction('u1', 's1')

    expect(result).toEqual({ success: false, error: 'Error al asignar sector' })
  })
})

describe('inviteUserAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'admin1' })
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debería invitar usuario y revalidar ruta', async () => {
    mockInviteUser.mockResolvedValue({ user: { id: 'u1', email: 'test@test.com' } })
    mockUpdateRole.mockResolvedValue({ id: 'u1', role: 'cashier' })
    mockAssignSector.mockResolvedValue({ id: 'u1' })

    const result = await inviteUserAction('test@test.com', 'Juan', 'cashier', 's1')

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
    mockInviteUser.mockResolvedValue({ user: { id: 'u1', email: 'test@test.com' } })

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
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'admin1' })
  })

  it('debería eliminar usuario y revalidar ruta', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'other-user' } } })
    mockDeleteUser.mockResolvedValue(undefined)

    const result = await deleteUserAction('u1')

    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(result).toEqual({ success: true })
  })

  it('debería rechazar eliminación de propia cuenta', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'admin1' } } })

    const result = await deleteUserAction('admin1')

    expect(result).toEqual({ success: false, error: 'No puedes eliminar tu propia cuenta' })
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await deleteUserAction('u1')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'other-user' } } })
    mockDeleteUser.mockRejectedValue(new Error('Not found'))

    const result = await deleteUserAction('u1')

    expect(result).toEqual({ success: false, error: 'Not found' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'other-user' } } })
    mockDeleteUser.mockRejectedValue('fail')

    const result = await deleteUserAction('u1')

    expect(result).toEqual({ success: false, error: 'Error al eliminar usuario' })
  })
})
