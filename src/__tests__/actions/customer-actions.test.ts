import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRegisterCustomer = vi.fn()
const mockUpdateCustomer = vi.fn()
const mockDeleteCustomer = vi.fn()

vi.mock('@/services/customer-service', () => ({
  CustomerService: vi.fn().mockImplementation(() => ({
    registerCustomer: mockRegisterCustomer,
    updateCustomer: mockUpdateCustomer,
    deleteCustomer: mockDeleteCustomer,
  })),
  getCustomerService: vi.fn().mockReturnValue({
    registerCustomer: mockRegisterCustomer,
    updateCustomer: mockUpdateCustomer,
    deleteCustomer: mockDeleteCustomer,
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
  registerCustomerAction,
  updateCustomerAction,
  deleteCustomerAction,
} = await import('@/app/admin/customers/actions')

describe('registerCustomerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería registrar cliente y revalidar ruta', async () => {
    mockRegisterCustomer.mockResolvedValue({ id: '00000000-0000-4000-8300-000000000030' })

    const result = await registerCustomerAction({ full_name: 'Juan', supply_number: '123', address: 'Calle 1' })

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockRegisterCustomer).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Juan' }), '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/customers')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await registerCustomerAction({ full_name: 'Juan' })

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si Zod validation falla', async () => {
    const result = await registerCustomerAction({ full_name: '' })

    expect(result.success).toBe(false)
  })

  it('debería retornar error si el servicio falla', async () => {
    mockRegisterCustomer.mockRejectedValue(new Error('Duplicate'))

    const result = await registerCustomerAction({ full_name: 'Juan', supply_number: '123', address: 'Calle 1' })

    expect(result).toEqual({ success: false, error: 'Duplicate' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockRegisterCustomer.mockRejectedValue('fail')

    const result = await registerCustomerAction({ full_name: 'Juan', supply_number: '123', address: 'Calle 1' })

    expect(result).toEqual({ success: false, error: 'Error al registrar cliente' })
  })
})

describe('updateCustomerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería actualizar cliente y revalidar ruta', async () => {
    mockUpdateCustomer.mockResolvedValue({ id: '00000000-0000-4000-8300-000000000030' })

    const result = await updateCustomerAction('00000000-0000-4000-8300-000000000030', { full_name: 'Pedro' })

    expect(mockUpdateCustomer).toHaveBeenCalledWith('00000000-0000-4000-8300-000000000030', expect.objectContaining({ full_name: 'Pedro' }), '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/customers')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await updateCustomerAction('00000000-0000-4000-8300-000000000030', { full_name: 'Pedro' })

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio falla', async () => {
    mockUpdateCustomer.mockRejectedValue(new Error('Not found'))

    const result = await updateCustomerAction('00000000-0000-4000-8300-000000000030', { full_name: 'Pedro' })

    expect(result).toEqual({ success: false, error: 'Not found' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockUpdateCustomer.mockRejectedValue(null)

    const result = await updateCustomerAction('00000000-0000-4000-8300-000000000030', { full_name: 'Pedro' })

    expect(result).toEqual({ success: false, error: 'Error al actualizar cliente' })
  })
})

describe('deleteCustomerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería eliminar cliente y revalidar ruta', async () => {
    mockDeleteCustomer.mockResolvedValue({ success: true })

    const result = await deleteCustomerAction('00000000-0000-4000-8300-000000000030')

    expect(mockDeleteCustomer).toHaveBeenCalledWith('00000000-0000-4000-8300-000000000030', '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/customers')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error del servicio si deleteCustomer falla', async () => {
    mockDeleteCustomer.mockResolvedValue({ success: false, error: 'Tiene recibos' })

    const result = await deleteCustomerAction('00000000-0000-4000-8300-000000000030')

    expect(result).toEqual({ success: false, error: 'Tiene recibos' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await deleteCustomerAction('00000000-0000-4000-8300-000000000030')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si el servicio lanza excepción', async () => {
    mockDeleteCustomer.mockRejectedValue(new Error('DB error'))

    const result = await deleteCustomerAction('00000000-0000-4000-8300-000000000030')

    expect(result).toEqual({ success: false, error: 'DB error' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockDeleteCustomer.mockRejectedValue('fail')

    const result = await deleteCustomerAction('00000000-0000-4000-8300-000000000030')

    expect(result).toEqual({ success: false, error: 'Error al eliminar cliente' })
  })
})
