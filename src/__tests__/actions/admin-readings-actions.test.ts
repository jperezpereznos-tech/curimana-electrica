import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAllForAdmin = vi.fn()
const mockUpdateReading = vi.fn()
const mockGetAllPeriods = vi.fn()

vi.mock('@/services/reading-service', () => ({
  ReadingService: vi.fn().mockImplementation(() => ({
    getAllForAdmin: mockGetAllForAdmin,
    updateReading: mockUpdateReading,
  })),
  getReadingService: vi.fn().mockReturnValue({
    getAllForAdmin: mockGetAllForAdmin,
    updateReading: mockUpdateReading,
  })
}))

vi.mock('@/services/period-service', () => ({
  PeriodService: vi.fn().mockImplementation(() => ({
    getAllPeriods: mockGetAllPeriods,
  })),
  getPeriodService: vi.fn().mockReturnValue({
    getAllPeriods: mockGetAllPeriods,
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

const { getReadingsAdminAction, getPeriodsForFilterAction, updateReadingAction } = await import('@/app/admin/readings/actions')

describe('getReadingsAdminAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería obtener lecturas sin filtros', async () => {
    const mockReadings = [{ id: '00000000-0000-4000-8800-000000000080', consumption: 50 }]
    mockGetAllForAdmin.mockResolvedValue(mockReadings)

    const result = await getReadingsAdminAction()

    expect(mockGetAllForAdmin).toHaveBeenCalledWith(undefined, undefined)
    expect(result).toEqual({ success: true, data: mockReadings })
  })

  it('debería obtener lecturas con filtros', async () => {
    const mockReadings = [{ id: '00000000-0000-4000-8800-000000000080', needs_review: true }]
    mockGetAllForAdmin.mockResolvedValue(mockReadings)

    const result = await getReadingsAdminAction('00000000-0000-4000-8600-000000000060', true)

    expect(mockGetAllForAdmin).toHaveBeenCalledWith('00000000-0000-4000-8600-000000000060', true)
    expect(result).toEqual({ success: true, data: mockReadings })
  })

  it('debería retornar error y data vacía si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await getReadingsAdminAction()

    expect(result).toEqual({ success: false, error: 'Error al obtener lecturas', data: [] })
  })

  it('debería retornar error y data vacía si el servicio falla', async () => {
    mockGetAllForAdmin.mockRejectedValue(new Error('DB error'))

    const result = await getReadingsAdminAction()

    expect(result).toEqual({ success: false, error: 'Error al obtener lecturas', data: [] })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockGetAllForAdmin.mockRejectedValue('str')

    const result = await getReadingsAdminAction()

    expect(result).toEqual({ success: false, error: 'Error al obtener lecturas', data: [] })
  })
})

describe('getPeriodsForFilterAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería obtener periodos para filtro', async () => {
    const mockPeriods = [{ id: '00000000-0000-4000-8600-000000000060', name: 'JUNIO 2025' }]
    mockGetAllPeriods.mockResolvedValue(mockPeriods)

    const result = await getPeriodsForFilterAction()

    expect(result).toEqual({ success: true, data: mockPeriods })
  })

  it('debería retornar error y data vacía si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await getPeriodsForFilterAction()

    expect(result).toEqual({ success: false, error: 'Error al obtener periodos', data: [] })
  })

  it('debería retornar error y data vacía si el servicio falla', async () => {
    mockGetAllPeriods.mockRejectedValue(new Error('DB error'))

    const result = await getPeriodsForFilterAction()

    expect(result).toEqual({ success: false, error: 'Error al obtener periodos', data: [] })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockGetAllPeriods.mockRejectedValue(null)

    const result = await getPeriodsForFilterAction()

    expect(result).toEqual({ success: false, error: 'Error al obtener periodos', data: [] })
  })
})

describe('updateReadingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería actualizar lectura y revalidar ruta', async () => {
    const mockUpdated = { id: '00000000-0000-4000-8800-000000000080', consumption: 50 }
    mockUpdateReading.mockResolvedValue(mockUpdated)

    const result = await updateReadingAction('00000000-0000-4000-8800-000000000080', { current_reading: 150 })

    expect(mockUpdateReading).toHaveBeenCalledWith('00000000-0000-4000-8800-000000000080', { current_reading: 150 }, '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/readings')
    expect(result).toEqual({ success: true, data: mockUpdated })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateReadingAction('00000000-0000-4000-8800-000000000080', { needs_review: false })

    expect(result).toEqual({ success: false, error: 'Error al actualizar lectura' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si updateReading falla', async () => {
    mockUpdateReading.mockRejectedValue(new Error('Lectura no encontrada'))

    const result = await updateReadingAction('00000000-0000-4000-8800-000000000080', { current_reading: 150 })

    expect(result).toEqual({ success: false, error: 'Error al actualizar lectura' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateReading.mockRejectedValue(42)

    const result = await updateReadingAction('00000000-0000-4000-8800-000000000080', { current_reading: 150 })

    expect(result).toEqual({ success: false, error: 'Error al actualizar lectura' })
  })

  it('debería actualizar solo needs_review sin relecturas', async () => {
    const mockUpdated = { id: '00000000-0000-4000-8800-000000000080', needs_review: false }
    mockUpdateReading.mockResolvedValue(mockUpdated)

    const result = await updateReadingAction('00000000-0000-4000-8800-000000000080', { needs_review: false })

    expect(mockUpdateReading).toHaveBeenCalledWith('00000000-0000-4000-8800-000000000080', { needs_review: false }, '00000000-0000-4000-8100-000000000001')
    expect(result).toEqual({ success: true, data: mockUpdated })
  })
})
