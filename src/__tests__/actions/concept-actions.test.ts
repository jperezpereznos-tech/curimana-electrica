import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateConcept = vi.fn()
const mockUpdateConcept = vi.fn()
const mockToggleConceptStatus = vi.fn()
const mockDeleteConcept = vi.fn()

vi.mock('@/services/concept-service', () => ({
  ConceptService: vi.fn().mockImplementation(() => ({
    createConcept: mockCreateConcept,
    updateConcept: mockUpdateConcept,
    toggleConceptStatus: mockToggleConceptStatus,
    deleteConcept: mockDeleteConcept,
  })),
  getConceptService: vi.fn().mockReturnValue({
    createConcept: mockCreateConcept,
    updateConcept: mockUpdateConcept,
    toggleConceptStatus: mockToggleConceptStatus,
    deleteConcept: mockDeleteConcept,
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

const { registerConceptAction, toggleConceptStatusAction, deleteConceptAction, updateConceptAction } = await import('@/app/admin/concepts/actions')

describe('registerConceptAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería crear concepto y revalidar la ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8900-000000000090', code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true }
    mockCreateConcept.mockResolvedValue(mockResult)

    const result = await registerConceptAction({
      code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true
    })

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockCreateConcept).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ALUM', name: 'Alumbrado' }),
      '00000000-0000-4000-8100-000000000001'
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/concepts')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await registerConceptAction({
      code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true
    })

    expect(result).toEqual({ success: false, error: 'Error al crear el concepto' })
    expect(mockCreateConcept).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si Zod validation falla', async () => {
    const result = await registerConceptAction({
      code: 'A', name: 'A', amount: -1, type: 'invalid', is_active: true
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
    expect(mockCreateConcept).not.toHaveBeenCalled()
  })

  it('debería retornar error si createConcept falla', async () => {
    mockCreateConcept.mockRejectedValue(new Error('Código duplicado'))

    const result = await registerConceptAction({
      code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true
    })

    expect(result).toEqual({ success: false, error: 'Error al crear el concepto' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockCreateConcept.mockRejectedValue('string error')

    const result = await registerConceptAction({
      code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true
    })

    expect(result).toEqual({ success: false, error: 'Error al crear el concepto' })
  })

  it('debería aceptar concepto con applies_to_tariff_id null', async () => {
    mockCreateConcept.mockResolvedValue({ id: '00000000-0000-4000-8900-000000000090' })

    const result = await registerConceptAction({
      code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true, applies_to_tariff_id: null
    })

    expect(result.success).toBe(true)
    expect(mockCreateConcept).toHaveBeenCalledWith(
      expect.objectContaining({ applies_to_tariff_id: null }),
      '00000000-0000-4000-8100-000000000001'
    )
  })

  it('debería aceptar concepto con description opcional', async () => {
    mockCreateConcept.mockResolvedValue({ id: '00000000-0000-4000-8900-000000000090' })

    const result = await registerConceptAction({
      code: 'ALUM', name: 'Alumbrado', description: 'Cargo por alumbrado público', amount: 4.20, type: 'fixed', is_active: true
    })

    expect(result.success).toBe(true)
    expect(mockCreateConcept).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Cargo por alumbrado público' }),
      '00000000-0000-4000-8100-000000000001'
    )
  })
})

describe('toggleConceptStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería cambiar estado y revalidar la ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8900-000000000090', is_active: false }
    mockToggleConceptStatus.mockResolvedValue(mockResult)

    const result = await toggleConceptStatusAction('00000000-0000-4000-8900-000000000090', false)

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockToggleConceptStatus).toHaveBeenCalledWith('00000000-0000-4000-8900-000000000090', false, '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/concepts')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería activar un concepto', async () => {
    mockToggleConceptStatus.mockResolvedValue({ id: '00000000-0000-4000-8900-000000000090', is_active: true })

    const result = await toggleConceptStatusAction('00000000-0000-4000-8900-000000000090', true)

    expect(mockToggleConceptStatus).toHaveBeenCalledWith('00000000-0000-4000-8900-000000000090', true, '00000000-0000-4000-8100-000000000001')
    expect(result.success).toBe(true)
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await toggleConceptStatusAction('00000000-0000-4000-8900-000000000090', false)

    expect(result).toEqual({ success: false, error: 'Error al cambiar estado del concepto' })
    expect(mockToggleConceptStatus).not.toHaveBeenCalled()
  })

  it('debería retornar error si toggleConceptStatus falla', async () => {
    mockToggleConceptStatus.mockRejectedValue(new Error('Concepto no encontrado'))

    const result = await toggleConceptStatusAction('00000000-0000-4000-8900-000000000090', false)

    expect(result).toEqual({ success: false, error: 'Error al cambiar estado del concepto' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockToggleConceptStatus.mockRejectedValue(42)

    const result = await toggleConceptStatusAction('00000000-0000-4000-8900-000000000090', false)

    expect(result).toEqual({ success: false, error: 'Error al cambiar estado del concepto' })
  })
})

describe('deleteConceptAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería eliminar concepto y revalidar la ruta', async () => {
    mockDeleteConcept.mockResolvedValue(true)

    const result = await deleteConceptAction('00000000-0000-4000-8900-000000000090')

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockDeleteConcept).toHaveBeenCalledWith('00000000-0000-4000-8900-000000000090', '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/concepts')
    expect(result).toEqual({ success: true, data: true })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await deleteConceptAction('00000000-0000-4000-8900-000000000090')

    expect(result).toEqual({ success: false, error: 'Error al eliminar el concepto' })
    expect(mockDeleteConcept).not.toHaveBeenCalled()
  })

  it('debería retornar error si deleteConcept falla', async () => {
    mockDeleteConcept.mockRejectedValue(new Error('Restricción de clave foránea'))

    const result = await deleteConceptAction('00000000-0000-4000-8900-000000000090')

    expect(result).toEqual({ success: false, error: 'Error al eliminar el concepto' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockDeleteConcept.mockRejectedValue('unknown')

    const result = await deleteConceptAction('00000000-0000-4000-8900-000000000090')

    expect(result).toEqual({ success: false, error: 'Error al eliminar el concepto' })
  })
})

describe('updateConceptAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería actualizar concepto y revalidar la ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8900-000000000090', name: 'Alumbrado Público', amount: 5.00 }
    mockUpdateConcept.mockResolvedValue(mockResult)

    const result = await updateConceptAction('00000000-0000-4000-8900-000000000090', { name: 'Alumbrado Público', amount: 5.00 })

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockUpdateConcept).toHaveBeenCalledWith('00000000-0000-4000-8900-000000000090', { name: 'Alumbrado Público', amount: 5.00 }, '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/concepts')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateConceptAction('00000000-0000-4000-8900-000000000090', { name: 'Test' })

    expect(result).toEqual({ success: false, error: 'Error al actualizar el concepto' })
    expect(mockUpdateConcept).not.toHaveBeenCalled()
  })

  it('debería retornar error si Zod validation falla', async () => {
    const result = await updateConceptAction('00000000-0000-4000-8900-000000000090', { code: 'A', amount: -5 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeTruthy()
    }
    expect(mockUpdateConcept).not.toHaveBeenCalled()
  })

  it('debería retornar error si updateConcept falla', async () => {
    mockUpdateConcept.mockRejectedValue(new Error('Concepto no encontrado'))

    const result = await updateConceptAction('00000000-0000-4000-8900-000000000090', { name: 'Test' })

    expect(result).toEqual({ success: false, error: 'Error al actualizar el concepto' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateConcept.mockRejectedValue(null)

    const result = await updateConceptAction('00000000-0000-4000-8900-000000000090', { name: 'Test' })

    expect(result).toEqual({ success: false, error: 'Error al actualizar el concepto' })
  })

  it('debería aceptar applies_to_tariff_id null en actualización', async () => {
    mockUpdateConcept.mockResolvedValue({ id: '00000000-0000-4000-8900-000000000090' })

    const result = await updateConceptAction('00000000-0000-4000-8900-000000000090', { applies_to_tariff_id: null })

    expect(result.success).toBe(true)
    expect(mockUpdateConcept).toHaveBeenCalledWith('00000000-0000-4000-8900-000000000090', { applies_to_tariff_id: null }, '00000000-0000-4000-8100-000000000001')
  })
})
