import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireAdminAuth = vi.fn()

vi.mock('@/lib/auth/server-admin-auth', () => ({
  requireAdminAuth: () => mockRequireAdminAuth()
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const mockUpdateConfig = vi.fn()

vi.mock('@/services/municipality-config-service', () => ({
  MunicipalityConfigService: vi.fn().mockImplementation(() => ({
    updateConfig: mockUpdateConfig,
  })),
  getMunicipalityConfigService: vi.fn().mockReturnValue({
    updateConfig: mockUpdateConfig,
  })
}))

const { updateMunicipalityConfigAction } = await import('@/app/admin/config/actions')

describe('updateMunicipalityConfigAction', () => {
  const validData = {
    name: 'Municipalidad Distrital de Curimana',
    ruc: '20123456789',
    address: 'Plaza de Armas S/N',
    billing_cut_day: 26,
    payment_grace_days: 20,
    logo_url: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001', role: 'admin' })
  })

  it('debería actualizar la configuración y revalidar las rutas', async () => {
    mockUpdateConfig.mockResolvedValue({ id: '00000000-0000-4000-8900-000000000099' })

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/config')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/receipts')
    expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({
      name: validData.name,
      ruc: validData.ruc,
      address: validData.address,
      billing_cut_day: validData.billing_cut_day,
      payment_grace_days: validData.payment_grace_days,
      logo_url: null
    }))
  })

  it('debería retornar error si updateConfig falla', async () => {
    mockUpdateConfig.mockRejectedValue(new Error('Update failed'))

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: false, error: 'Error al actualizar configuracion' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería usar logo_url null si se pasa string vacío', async () => {
    mockUpdateConfig.mockResolvedValue({ id: '00000000-0000-4000-8900-000000000099' })

    const result = await updateMunicipalityConfigAction({ ...validData, logo_url: '' })

    expect(result).toEqual({ success: true })
    expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({
      logo_url: null
    }))
  })

  it('debería usar logo_url proporcionado si no está vacío', async () => {
    mockUpdateConfig.mockResolvedValue({ id: '00000000-0000-4000-8900-000000000099' })

    const result = await updateMunicipalityConfigAction({ ...validData, logo_url: 'https://example.com/logo.png' })

    expect(result).toEqual({ success: true })
    expect(mockUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({
      logo_url: 'https://example.com/logo.png'
    }))
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: false, error: 'Error al actualizar configuracion' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateConfig.mockRejectedValue('string error')

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: false, error: 'Error al actualizar configuracion' })
  })
})
