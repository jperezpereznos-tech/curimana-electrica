import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVoidPayment = vi.fn()
const mockGetPaymentDetails = vi.fn()
const mockGetBySupplyNumber = vi.fn()
const mockGetAllReceipts = vi.fn()

vi.mock('@/services/payment-service', () => ({
  PaymentService: vi.fn().mockImplementation(() => ({
    voidPayment: mockVoidPayment,
    getPaymentDetails: mockGetPaymentDetails,
  })),
  getPaymentService: vi.fn().mockReturnValue({ voidPayment: mockVoidPayment, getPaymentDetails: mockGetPaymentDetails })
}))

vi.mock('@/services/customer-service', () => ({
  CustomerService: vi.fn().mockImplementation(() => ({
    getBySupplyNumber: mockGetBySupplyNumber,
  })),
  getCustomerService: vi.fn().mockReturnValue({ getBySupplyNumber: mockGetBySupplyNumber })
}))

vi.mock('@/services/receipt-service', () => ({
  ReceiptService: vi.fn().mockImplementation(() => ({
    getAllReceipts: mockGetAllReceipts,
  })),
  getReceiptService: vi.fn().mockReturnValue({ getAllReceipts: mockGetAllReceipts })
}))

const mockRequireAdminAuth = vi.fn()
vi.mock('@/lib/auth/server-admin-auth', () => ({
  requireAdminAuth: () => mockRequireAdminAuth()
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const { voidPaymentAction, adminSearchCustomerReceiptsAction, getPaymentDetailsAction } = await import('@/app/admin/payments/actions')

describe('voidPaymentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: 'admin1' })
  })

  it('debería anular el pago y revalidar rutas', async () => {
    mockVoidPayment.mockResolvedValue(undefined)

    const result = await voidPaymentAction('p1')

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockVoidPayment).toHaveBeenCalledWith('p1', 'admin1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/payments')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/receipts')
    expect(result).toEqual({ success: true })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await voidPaymentAction('p1')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
    expect(mockVoidPayment).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si voidPayment falla', async () => {
    mockVoidPayment.mockRejectedValue(new Error('El pago ya esta anulado'))

    const result = await voidPaymentAction('p1')

    expect(result).toEqual({ success: false, error: 'El pago ya esta anulado' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockVoidPayment.mockRejectedValue('string error')

    const result = await voidPaymentAction('p1')

    expect(result).toEqual({ success: false, error: 'Error al anular el pago' })
  })
})

describe('adminSearchCustomerReceiptsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {} })
  })

  it('debería retornar cliente y recibos cobrables', async () => {
    const mockCustomer = { id: 'c1', supply_number: 'SUM-001', full_name: 'Juan' }
    const mockPending = [{ id: 'r1', status: 'pending' }]
    const mockPartial = [{ id: 'r2', status: 'partial' }]

    mockGetBySupplyNumber.mockResolvedValue(mockCustomer)
    mockGetAllReceipts
      .mockResolvedValueOnce(mockPending)
      .mockResolvedValueOnce(mockPartial)
      .mockResolvedValueOnce([])

    const result = await adminSearchCustomerReceiptsAction('SUM-001')

    expect(mockGetBySupplyNumber).toHaveBeenCalledWith('SUM-001')
    expect(mockGetAllReceipts).toHaveBeenCalledWith({ customerId: 'c1', status: 'pending' })
    expect(mockGetAllReceipts).toHaveBeenCalledWith({ customerId: 'c1', status: 'partial' })
    expect(mockGetAllReceipts).toHaveBeenCalledWith({ customerId: 'c1', status: 'overdue' })
    expect(result).toEqual({
      success: true, data: { customer: mockCustomer, receipts: [...mockPending, ...mockPartial] }
    })
  })

  it('debería retornar data null si no se encuentran clientes', async () => {
    mockGetBySupplyNumber.mockResolvedValue(null)

    const result = await adminSearchCustomerReceiptsAction('NONEXISTENT')

    expect(result).toEqual({ success: true, data: null })
    expect(mockGetAllReceipts).not.toHaveBeenCalled()
  })

  it('debería retornar data null si getBySupplyNumber retorna null', async () => {
    mockGetBySupplyNumber.mockResolvedValue(null)

    const result = await adminSearchCustomerReceiptsAction('query')

    expect(result).toEqual({ success: true, data: null })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await adminSearchCustomerReceiptsAction('SUM-001')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error genérico si la búsqueda falla', async () => {
    mockGetBySupplyNumber.mockRejectedValue(new Error('DB error'))

    const result = await adminSearchCustomerReceiptsAction('SUM-001')

    expect(result).toEqual({ success: false, error: 'DB error' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockGetBySupplyNumber.mockRejectedValue('unknown')

    const result = await adminSearchCustomerReceiptsAction('SUM-001')

    expect(result).toEqual({ success: false, error: 'Error al buscar recibos del cliente' })
  })
})

describe('getPaymentDetailsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {} })
  })

  it('debería retornar detalles del pago', async () => {
    const mockDetail = { id: 'p1', amount: 100, receipts: { receipt_number: 1 }, cashier: { full_name: 'Ana' } }
    mockGetPaymentDetails.mockResolvedValue(mockDetail)

    const result = await getPaymentDetailsAction('p1')

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockGetPaymentDetails).toHaveBeenCalledWith('p1')
    expect(result).toEqual({ success: true, data: mockDetail })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await getPaymentDetailsAction('p1')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si getPaymentDetails falla', async () => {
    mockGetPaymentDetails.mockRejectedValue(new Error('Pago no encontrado'))

    const result = await getPaymentDetailsAction('missing')

    expect(result).toEqual({ success: false, error: 'Pago no encontrado' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockGetPaymentDetails.mockRejectedValue('unknown')

    const result = await getPaymentDetailsAction('p1')

    expect(result).toEqual({ success: false, error: 'Error al obtener detalles del pago' })
  })
})
