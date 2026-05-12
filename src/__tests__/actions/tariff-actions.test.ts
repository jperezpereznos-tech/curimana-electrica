import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateTariff = vi.fn()
const mockToggleTariff = vi.fn()
const mockDeleteTariff = vi.fn()
const mockUpdateTariff = vi.fn()

vi.mock('@/services/tariff-service', () => ({
  TariffService: vi.fn().mockImplementation(() => ({
    createTariffWithValidation: mockCreateTariff,
    toggleTariffStatus: mockToggleTariff,
    deleteTariff: mockDeleteTariff,
    updateTariffWithTiers: mockUpdateTariff,
  })),
  getTariffService: vi.fn().mockReturnValue({
    createTariffWithValidation: mockCreateTariff,
    toggleTariffStatus: mockToggleTariff,
    deleteTariff: mockDeleteTariff,
    updateTariffWithTiers: mockUpdateTariff,
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

const {
  registerTariffAction,
  toggleTariffStatusAction,
  deleteTariffAction,
  updateTariffAction,
} = await import('@/app/admin/tariffs/actions')

describe('registerTariffAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: 'admin1' })
  })

  it('debería crear tarifa y revalidar ruta', async () => {
    const mockResult = { id: 't1', name: 'BTSB' }
    mockCreateTariff.mockResolvedValue(mockResult)

    const result = await registerTariffAction(
      { name: 'BTSB', connection_type: 'monofásico', is_active: true },
      [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1, order_index: 1 }]
    )

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockCreateTariff).toHaveBeenCalledWith(expect.objectContaining({ name: 'BTSB' }), expect.any(Array), 'admin1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/tariffs')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await registerTariffAction({ name: 'BTSB' }, [])

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si Zod validation de tarifa falla', async () => {
    const result = await registerTariffAction({ name: '' }, [])

    expect(result.success).toBe(false)
  })

  it('debería retornar error si Zod validation de tramos falla', async () => {
    const result = await registerTariffAction({ name: 'BTSB' }, 'not an array')

    expect(result.success).toBe(false)
  })

  it('debería retornar error si el servicio falla', async () => {
    mockCreateTariff.mockRejectedValue(new Error('Validate error'))

    const result = await registerTariffAction({ name: 'BTSB' }, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1, order_index: 1 }])

    expect(result).toEqual({ success: false, error: 'Validate error' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockCreateTariff.mockRejectedValue('fail')

    const result = await registerTariffAction({ name: 'BTSB' }, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1, order_index: 1 }])

    expect(result).toEqual({ success: false, error: 'Error al crear la tarifa' })
  })
})

describe('toggleTariffStatusAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: 'admin1' })
  })

  it('debería cambiar estado y revalidar ruta', async () => {
    const mockResult = { id: 't1', is_active: false }
    mockToggleTariff.mockResolvedValue(mockResult)

    const result = await toggleTariffStatusAction('t1', false)

    expect(mockToggleTariff).toHaveBeenCalledWith('t1', false, 'admin1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/tariffs')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await toggleTariffStatusAction('t1', true)

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockToggleTariff.mockRejectedValue(new Error('Not found'))

    const result = await toggleTariffStatusAction('t1', true)

    expect(result).toEqual({ success: false, error: 'Not found' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockToggleTariff.mockRejectedValue(null)

    const result = await toggleTariffStatusAction('t1', true)

    expect(result).toEqual({ success: false, error: 'Error al cambiar estado de la tarifa' })
  })
})

describe('deleteTariffAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: 'admin1' })
  })

  it('debería eliminar tarifa y revalidar ruta', async () => {
    mockDeleteTariff.mockResolvedValue(true)

    const result = await deleteTariffAction('t1')

    expect(mockDeleteTariff).toHaveBeenCalledWith('t1', 'admin1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/tariffs')
    expect(result).toEqual({ success: true, data: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await deleteTariffAction('t1')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockDeleteTariff.mockRejectedValue(new Error('FK constraint'))

    const result = await deleteTariffAction('t1')

    expect(result).toEqual({ success: false, error: 'FK constraint' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockDeleteTariff.mockRejectedValue('fail')

    const result = await deleteTariffAction('t1')

    expect(result).toEqual({ success: false, error: 'Error al eliminar la tarifa' })
  })
})

describe('updateTariffAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: 'admin1' })
  })

  it('debería actualizar tarifa y revalidar ruta', async () => {
    const mockResult = { id: 't1', name: 'BTSB v2' }
    mockUpdateTariff.mockResolvedValue(mockResult)

    const result = await updateTariffAction('t1', { name: 'BTSB v2' }, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1.5, order_index: 1 }])

    expect(mockUpdateTariff).toHaveBeenCalledWith('t1', expect.objectContaining({ name: 'BTSB v2' }), expect.any(Array), 'admin1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/tariffs')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateTariffAction('t1', { name: 'BTSB' }, [])

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si Zod validation de tramos falla', async () => {
    const result = await updateTariffAction('t1', { name: 'BTSB' }, 'not array')

    expect(result.success).toBe(false)
  })

  it('debería retornar error si el servicio falla', async () => {
    mockUpdateTariff.mockRejectedValue(new Error('Validate error'))

    const result = await updateTariffAction('t1', { name: 'BTSB' }, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1, order_index: 1 }])

    expect(result).toEqual({ success: false, error: 'Validate error' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateTariff.mockRejectedValue(42)

    const result = await updateTariffAction('t1', { name: 'BTSB' }, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1, order_index: 1 }])

    expect(result).toEqual({ success: false, error: 'Error al actualizar la tarifa' })
  })
})
