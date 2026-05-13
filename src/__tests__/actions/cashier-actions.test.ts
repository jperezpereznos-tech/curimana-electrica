import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProcessPayment = vi.fn()
const mockProcessBatchPayment = vi.fn()
const mockOpenClosure = vi.fn()
const mockCloseClosure = vi.fn()
const mockSearchCustomers = vi.fn()
const mockGetAllReceipts = vi.fn()
const mockGetReceiptByNumber = vi.fn()
const mockGetPaymentsByCustomer = vi.fn()
const mockGetPaymentDetails = vi.fn()
const mockGetPaymentsByCashier = vi.fn()

vi.mock('@/services/payment-service', () => ({
  PaymentService: vi.fn().mockImplementation(() => ({
    processPayment: mockProcessPayment,
    processBatchPayment: mockProcessBatchPayment,
    getPaymentsByCustomer: mockGetPaymentsByCustomer,
    getPaymentDetails: mockGetPaymentDetails,
    getPaymentsByCashier: mockGetPaymentsByCashier,
  })),
  getPaymentService: vi.fn().mockReturnValue({
    processPayment: mockProcessPayment,
    processBatchPayment: mockProcessBatchPayment,
    getPaymentsByCustomer: mockGetPaymentsByCustomer,
    getPaymentDetails: mockGetPaymentDetails,
    getPaymentsByCashier: mockGetPaymentsByCashier,
  })
}))

vi.mock('@/services/cash-closure-service', () => ({
  CashClosureService: vi.fn().mockImplementation(() => ({
    openClosure: mockOpenClosure,
    closeClosure: mockCloseClosure,
  })),
  getCashClosureService: vi.fn().mockReturnValue({
    openClosure: mockOpenClosure,
    closeClosure: mockCloseClosure,
  })
}))

vi.mock('@/services/customer-service', () => ({
  CustomerService: vi.fn().mockImplementation(() => ({
    searchCustomers: mockSearchCustomers,
  })),
  getCustomerService: vi.fn().mockReturnValue({
    searchCustomers: mockSearchCustomers,
  })
}))

vi.mock('@/services/receipt-service', () => ({
  ReceiptService: vi.fn().mockImplementation(() => ({
    getAllReceipts: mockGetAllReceipts,
    getReceiptByNumber: mockGetReceiptByNumber,
  })),
  getReceiptService: vi.fn().mockReturnValue({
    getAllReceipts: mockGetAllReceipts,
    getReceiptByNumber: mockGetReceiptByNumber,
  })
}))

const mockRequireCashierAuth = vi.fn()
vi.mock('@/lib/auth/server-cashier-auth', () => ({
  requireCashierAuth: () => mockRequireCashierAuth()
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const {
  processPaymentAction,
  processBatchPaymentAction,
  openClosureAction,
  closeClosureAction,
  searchCashierCustomerAction,
  getCustomerPaymentsAction,
  getPaymentVoucherDataAction,
  getPaymentsByCashierAction,
} = await import('@/app/cashier/actions')

describe('processPaymentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: 'cashier1' })
  })

  it('debería procesar pago y revalidar ruta', async () => {
    const mockResult = { id: 'pay1', amount: 50 }
    mockProcessPayment.mockResolvedValue(mockResult)

    const result = await processPaymentAction({
      receiptId: 'r1', customerId: 'c1', cashClosureId: 'cl1',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(mockRequireCashierAuth).toHaveBeenCalled()
    expect(mockProcessPayment).toHaveBeenCalledWith(expect.objectContaining({ receiptId: 'r1', cashierUserId: 'cashier1' }))
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireCashierAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await processPaymentAction({
      receiptId: 'r1', customerId: 'c1', cashClosureId: 'cl1',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería retornar error si processPayment falla', async () => {
    mockProcessPayment.mockRejectedValue(new Error('Caja cerrada'))

    const result = await processPaymentAction({
      receiptId: 'r1', customerId: 'c1', cashClosureId: 'cl1',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(result).toEqual({ success: false, error: 'Caja cerrada' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockProcessPayment.mockRejectedValue('string error')

    const result = await processPaymentAction({
      receiptId: 'r1', customerId: 'c1', cashClosureId: 'cl1',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(result).toEqual({ success: false, error: 'Error al procesar el pago.' })
  })
})

describe('processBatchPaymentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: 'cashier1' })
  })

  it('debería procesar lote y revalidar ruta', async () => {
    const mockResult = [{ id: 'pay1', receiptId: 'r1', amount: 50 }]
    mockProcessBatchPayment.mockResolvedValue(mockResult)

    const result = await processBatchPaymentAction({
      payments: [{ receiptId: 'r1', amount: 50 }],
      customerId: 'c1', cashClosureId: 'cl1', paymentMethod: 'cash'
    })

    expect(mockProcessBatchPayment).toHaveBeenCalledWith(expect.objectContaining({ cashierUserId: 'cashier1' }))
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si processBatchPayment falla', async () => {
    mockProcessBatchPayment.mockRejectedValue(new Error('Lote fallido'))

    const result = await processBatchPaymentAction({
      payments: [], customerId: 'c1', cashClosureId: 'cl1', paymentMethod: 'cash'
    })

    expect(result).toEqual({ success: false, error: 'Lote fallido' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockProcessBatchPayment.mockRejectedValue(null)

    const result = await processBatchPaymentAction({
      payments: [], customerId: 'c1', cashClosureId: 'cl1', paymentMethod: 'cash'
    })

    expect(result).toEqual({ success: false, error: 'Error al procesar el pago lote.' })
  })
})

describe('openClosureAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: 'cashier1' })
  })

  it('debería abrir caja y revalidar ruta', async () => {
    const mockResult = { id: 'cl1', status: 'open' }
    mockOpenClosure.mockResolvedValue(mockResult)

    const result = await openClosureAction(200)

    expect(mockOpenClosure).toHaveBeenCalledWith('cashier1', 200)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si openClosure falla', async () => {
    mockOpenClosure.mockRejectedValue(new Error('Ya tienes una caja abierta'))

    const result = await openClosureAction(200)

    expect(result).toEqual({ success: false, error: 'Ya tienes una caja abierta' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockOpenClosure.mockRejectedValue(42)

    const result = await openClosureAction(200)

    expect(result).toEqual({ success: false, error: 'Error al abrir caja.' })
  })
})

describe('closeClosureAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: 'cashier1' })
  })

  it('debería cerrar caja y revalidar ruta', async () => {
    const mockResult = { id: 'cl1', status: 'closed' }
    mockCloseClosure.mockResolvedValue(mockResult)

    const result = await closeClosureAction('cl1')

    expect(mockCloseClosure).toHaveBeenCalledWith('cl1', 'cashier1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si closeClosure falla', async () => {
    mockCloseClosure.mockRejectedValue(new Error('La caja ya está cerrada'))

    const result = await closeClosureAction('cl1')

    expect(result).toEqual({ success: false, error: 'La caja ya está cerrada' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockCloseClosure.mockRejectedValue('str')

    const result = await closeClosureAction('cl1')

    expect(result).toEqual({ success: false, error: 'Error al cerrar caja.' })
  })
})

describe('searchCashierCustomerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { current_debt: 0 }, error: null }),
    })
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: vi.fn().mockResolvedValue({ data: 0, error: null }), from: mockFrom }, userId: 'cashier1' })
  })

  it('debería buscar cliente y sus recibos pendientes', async () => {
    const mockCustomer = { supply_number: 'SUM-001', full_name: 'Juan' }
    mockSearchCustomers.mockResolvedValue([mockCustomer])
    mockGetAllReceipts.mockResolvedValue([{ id: 'r1' }])

    const result = await searchCashierCustomerAction('SUM-001')

    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.customer).toEqual(mockCustomer)
    }
  })

  it('debería retornar data null si no se encuentran clientes', async () => {
    mockSearchCustomers.mockResolvedValue([])

    const result = await searchCashierCustomerAction('NOPE')

    expect(result).toEqual({ success: true, data: null })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireCashierAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await searchCashierCustomerAction('SUM-001')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockSearchCustomers.mockRejectedValue('fail')

    const result = await searchCashierCustomerAction('SUM-001')

    expect(result).toEqual({ success: false, error: 'Error al buscar cliente.' })
  })

  it('debería buscar por número de recibo cuando el query es numérico', async () => {
    const mockReceipt = { id: 'r1', receipt_number: 42, customer_id: 'c1', status: 'pending' }
    const mockCustomer = { id: 'c1', supply_number: '608132421', full_name: 'Juan', current_debt: 50 }
    mockGetReceiptByNumber.mockResolvedValue(mockReceipt)
    mockSearchCustomers.mockResolvedValue([mockCustomer])
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
    })
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: vi.fn().mockResolvedValue({ data: 0, error: null }), from: mockFrom }, userId: 'cashier1' })

    const result = await searchCashierCustomerAction('42')

    expect(mockGetReceiptByNumber).toHaveBeenCalledWith(42)
    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.receipts).toEqual([mockReceipt])
    }
  })

  it('debería retornar null si busca por número de recibo y no existe', async () => {
    mockGetReceiptByNumber.mockResolvedValue(null)
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: vi.fn().mockResolvedValue({ data: 0, error: null }), from: vi.fn() }, userId: 'cashier1' })

    const result = await searchCashierCustomerAction('999')

    expect(result).toEqual({ success: true, data: null })
  })

  it('debería deduplicar recibos por id al concatenar', async () => {
    const mockCustomer = { supply_number: '608132421', full_name: 'Juan' }
    mockSearchCustomers.mockResolvedValue([mockCustomer])
    const duplicateReceipt = { id: 'r1', receipt_number: 1, status: 'pending' }
    mockGetAllReceipts.mockImplementation((filters: any) => {
      if (filters.status === 'pending') return Promise.resolve([duplicateReceipt, { id: 'r2', status: 'pending' }])
      if (filters.status === 'partial') return Promise.resolve([duplicateReceipt])
      return Promise.resolve([])
    })
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { current_debt: 0 }, error: null }),
    })
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: vi.fn().mockResolvedValue({ data: 0, error: null }), from: mockFrom }, userId: 'cashier1' })

    const result = await searchCashierCustomerAction('608132421')

    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.receipts.length).toBe(2)
      expect(result.data.receipts.map((r: any) => r.id)).toEqual(['r1', 'r2'])
    }
  })
})

describe('getCustomerPaymentsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: 'cashier1' })
  })

  it('debería obtener pagos del cliente', async () => {
    const mockPayments = [{ id: 'p1', amount: 50 }]
    mockGetPaymentsByCustomer.mockResolvedValue(mockPayments)

    const result = await getCustomerPaymentsAction('c1')

    expect(result).toEqual({ success: true, data: mockPayments })
  })

  it('debería retornar error si falla', async () => {
    mockGetPaymentsByCustomer.mockRejectedValue(new Error('DB error'))

    const result = await getCustomerPaymentsAction('c1')

    expect(result).toEqual({ success: false, error: 'DB error' })
  })
})

describe('getPaymentVoucherDataAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: 'cashier1' })
  })

  it('debería obtener datos del comprobante', async () => {
    const mockData = { id: 'p1', amount: 50, receipts: {} }
    mockGetPaymentDetails.mockResolvedValue(mockData)

    const result = await getPaymentVoucherDataAction('p1')

    expect(result).toEqual({ success: true, data: mockData })
  })

  it('debería retornar error si falla', async () => {
    mockGetPaymentDetails.mockRejectedValue(new Error('Not found'))

    const result = await getPaymentVoucherDataAction('p1')

    expect(result).toEqual({ success: false, error: 'Not found' })
  })
})

describe('getPaymentsByCashierAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: 'cashier1' })
  })

  it('debería obtener pagos del cajero y mapear campos', async () => {
    const mockPayments = [{
      id: 'p1', amount: 50, payment_date: '2025-06-10', status: 'completed', reference: 'ref1',
      receipts: { receipt_number: '1', customers: { full_name: 'Juan', supply_number: 'SUM-001' } }
    }]
    mockGetPaymentsByCashier.mockResolvedValue(mockPayments)

    const result = await getPaymentsByCashierAction('user1', {})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[0]).toEqual(expect.objectContaining({
        id: 'p1', amount: 50, customer_name: 'Juan', supply_number: 'SUM-001'
      }))
    }
  })

  it('debería manejar recibos sin datos', async () => {
    const mockPayments = [{ id: 'p1', amount: 50, payment_date: null, status: null, reference: null, receipts: null }]
    mockGetPaymentsByCashier.mockResolvedValue(mockPayments)

    const result = await getPaymentsByCashierAction('user1', {})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[0].receipt_number).toBe('N/A')
      expect(result.data[0].customer_name).toBe('Desconocido')
    }
  })

  it('debería retornar error si falla', async () => {
    mockGetPaymentsByCashier.mockRejectedValue(new Error('DB error'))

    const result = await getPaymentsByCashierAction('user1', {})

    expect(result).toEqual({ success: false, error: 'DB error' })
  })
})
