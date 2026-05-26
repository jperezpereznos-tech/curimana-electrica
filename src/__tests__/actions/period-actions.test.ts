import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClosePeriod = vi.fn()
const mockCreateNextPeriod = vi.fn()

vi.mock('@/services/period-service', () => ({
  PeriodService: vi.fn().mockImplementation(() => ({
    closePeriod: mockClosePeriod,
    createNextPeriod: mockCreateNextPeriod,
  })),
  getPeriodService: vi.fn().mockReturnValue({
    closePeriod: mockClosePeriod,
    createNextPeriod: mockCreateNextPeriod,
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

const { closePeriodAction, openNextPeriodAction } = await import('@/app/admin/periods/actions')

describe('closePeriodAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería cerrar el periodo y revalidar las rutas', async () => {
    const mockResult = { period_id: '00000000-0000-4000-8600-000000000060', receiptsGenerated: 5, skipped: 0, errors: [] }
    mockClosePeriod.mockResolvedValue(mockResult)

    const result = await closePeriodAction('00000000-0000-4000-8600-000000000060')

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockClosePeriod).toHaveBeenCalledWith('00000000-0000-4000-8600-000000000060', '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/periods')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/receipts')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/customers')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await closePeriodAction('00000000-0000-4000-8600-000000000060')

    expect(result).toEqual({ success: false, error: 'Error al cerrar el periodo' })
    expect(mockClosePeriod).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si closePeriod falla', async () => {
    mockClosePeriod.mockRejectedValue(new Error('El periodo ya está cerrado'))

    const result = await closePeriodAction('00000000-0000-4000-8600-000000000060')

    expect(result).toEqual({ success: false, error: 'Error al cerrar el periodo' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockClosePeriod.mockRejectedValue('string error')

    const result = await closePeriodAction('00000000-0000-4000-8600-000000000060')

    expect(result).toEqual({ success: false, error: 'Error al cerrar el periodo' })
  })
})

describe('openNextPeriodAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería crear el siguiente periodo y revalidar la ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8600-000000000061', name: 'JUNIO 2025', year: 2025, month: 6 }
    mockCreateNextPeriod.mockResolvedValue(mockResult)

    const result = await openNextPeriodAction()

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockCreateNextPeriod).toHaveBeenCalledWith('00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/periods')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await openNextPeriodAction()

    expect(result).toEqual({ success: false, error: 'Error al crear el siguiente periodo' })
    expect(mockCreateNextPeriod).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si createNextPeriod falla', async () => {
    mockCreateNextPeriod.mockRejectedValue(new Error('Ya existe un periodo abierto'))

    const result = await openNextPeriodAction()

    expect(result).toEqual({ success: false, error: 'Error al crear el siguiente periodo' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockCreateNextPeriod.mockRejectedValue(42)

    const result = await openNextPeriodAction()

    expect(result).toEqual({ success: false, error: 'Error al crear el siguiente periodo' })
  })
})
