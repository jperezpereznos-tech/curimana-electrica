import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateSector = vi.fn()
const mockUpdateSector = vi.fn()
const mockDeleteSector = vi.fn()

vi.mock('@/services/sector-service', () => ({
  SectorService: vi.fn().mockImplementation(() => ({
    createSector: mockCreateSector,
    updateSector: mockUpdateSector,
    deleteSector: mockDeleteSector,
  })),
  getSectorService: vi.fn().mockReturnValue({
    createSector: mockCreateSector,
    updateSector: mockUpdateSector,
    deleteSector: mockDeleteSector,
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

const mockFrom = vi.fn()
const mockSupabaseInstance = {
  from: mockFrom,
  auth: { getUser: vi.fn(), getClaims: vi.fn() },
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseInstance)
}))

const {
  createSectorAction,
  updateSectorAction,
  deleteSectorAction,
  assignReaderToSectorAction,
} = await import('@/app/admin/sectors/actions')

describe('createSectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería crear sector y revalidar ruta', async () => {
    mockCreateSector.mockResolvedValue({ id: '00000000-0000-4000-8100-000000000010' })

    const result = await createSectorAction({ name: 'Centro', code: 'CTR' })

    expect(mockCreateSector).toHaveBeenCalledWith({ name: 'Centro', code: 'CTR' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/sectors')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await createSectorAction({ name: 'Centro', code: 'CTR' })

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockCreateSector.mockRejectedValue(new Error('Duplicate code'))

    const result = await createSectorAction({ name: 'Centro', code: 'CTR' })

    expect(result).toEqual({ success: false, error: 'Duplicate code' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockCreateSector.mockRejectedValue('fail')

    const result = await createSectorAction({ name: 'Centro', code: 'CTR' })

    expect(result).toEqual({ success: false, error: 'Error al crear sector' })
  })
})

describe('updateSectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería actualizar sector y revalidar ruta', async () => {
    mockUpdateSector.mockResolvedValue({ id: '00000000-0000-4000-8100-000000000010', name: 'Norte' })

    const result = await updateSectorAction('00000000-0000-4000-8100-000000000010', { name: 'Norte' })

    expect(mockUpdateSector).toHaveBeenCalledWith('00000000-0000-4000-8100-000000000010', { name: 'Norte' })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/sectors')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateSectorAction('00000000-0000-4000-8100-000000000010', { name: 'Norte' })

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockUpdateSector.mockRejectedValue(new Error('Not found'))

    const result = await updateSectorAction('00000000-0000-4000-8100-000000000010', { name: 'Norte' })

    expect(result).toEqual({ success: false, error: 'Not found' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateSector.mockRejectedValue(null)

    const result = await updateSectorAction('00000000-0000-4000-8100-000000000010', { name: 'Norte' })

    expect(result).toEqual({ success: false, error: 'Error al actualizar sector' })
  })
})

describe('deleteSectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería eliminar sector y revalidar ruta', async () => {
    mockDeleteSector.mockResolvedValue(true)

    const result = await deleteSectorAction('00000000-0000-4000-8100-000000000010')

    expect(mockDeleteSector).toHaveBeenCalledWith('00000000-0000-4000-8100-000000000010')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/sectors')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await deleteSectorAction('00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockDeleteSector.mockRejectedValue(new Error('FK constraint'))

    const result = await deleteSectorAction('00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'FK constraint' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockDeleteSector.mockRejectedValue('fail')

    const result = await deleteSectorAction('00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'Error al eliminar sector' })
  })
})

describe('assignReaderToSectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería asignar sector al lector y revalidar ruta', async () => {
    const mockUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: '00000000-0000-4000-8100-000000000002' }], error: null }),
    }
    mockFrom.mockReturnValue(mockUpdateChain)

    const result = await assignReaderToSectorAction('00000000-0000-4000-8200-000000000002', '00000000-0000-4000-8100-000000000010')

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpdateChain.eq).toHaveBeenCalledWith('id', '00000000-0000-4000-8200-000000000002')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/sectors')
    expect(result).toEqual({ success: true })
  })

  it('debería desasignar sector si sectorId es null', async () => {
    const mockUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: '00000000-0000-4000-8100-000000000002' }], error: null }),
    }
    mockFrom.mockReturnValue(mockUpdateChain)

    const result = await assignReaderToSectorAction('00000000-0000-4000-8200-000000000002', null)

    expect(mockUpdateChain.update).toHaveBeenCalledWith({ assigned_sector_id: null })
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si la actualización falla', async () => {
    const mockUpdateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed' } }),
    }
    mockFrom.mockReturnValue(mockUpdateChain)

    const result = await assignReaderToSectorAction('00000000-0000-4000-8200-000000000002', '00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'Update failed' })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await assignReaderToSectorAction('00000000-0000-4000-8200-000000000002', '00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockFrom.mockImplementation(() => { throw 'fail' })

    const result = await assignReaderToSectorAction('00000000-0000-4000-8200-000000000002', '00000000-0000-4000-8100-000000000010')

    expect(result).toEqual({ success: false, error: 'Error al asignar lector' })
  })
})
