import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProcessPayment = vi.fn()
const mockProcessBatchPayment = vi.fn()
const mockOpenClosure = vi.fn()
const mockCloseClosure = vi.fn()
const mockSearchCustomers = vi.fn()
const mockGetBySupplyNumber = vi.fn()
const mockGetOpenReceiptsByCustomer = vi.fn()
const mockGetReceiptByNumber = vi.fn()
const mockGetPaymentsByCustomer = vi.fn()
const mockGetPaymentDetails = vi.fn()
const mockGetPaymentsByCashier = vi.fn()
const mockRecalculateCustomerDebt = vi.fn()

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
    getBySupplyNumber: mockGetBySupplyNumber,
  })),
  getCustomerService: vi.fn().mockReturnValue({
    searchCustomers: mockSearchCustomers,
    getBySupplyNumber: mockGetBySupplyNumber,
  })
}))

vi.mock('@/services/receipt-service', () => ({
  ReceiptService: vi.fn().mockImplementation(() => ({
    getOpenReceiptsByCustomer: mockGetOpenReceiptsByCustomer,
    getReceiptByNumber: mockGetReceiptByNumber,
    recalculateCustomerDebt: mockRecalculateCustomerDebt,
  })),
  getReceiptService: vi.fn().mockReturnValue({
    getOpenReceiptsByCustomer: mockGetOpenReceiptsByCustomer,
    getReceiptByNumber: mockGetReceiptByNumber,
    recalculateCustomerDebt: mockRecalculateCustomerDebt,
  })
}))

const mockGetConfig = vi.fn()

vi.mock('@/services/municipality-config-service', () => ({
  MunicipalityConfigService: vi.fn().mockImplementation(() => ({
    getConfig: mockGetConfig,
  })),
  getMunicipalityConfigService: vi.fn().mockReturnValue({
    getConfig: mockGetConfig,
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
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8200-000000000002' })
  })

  it('debería procesar pago y revalidar ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8400-000000000040', amount: 50 }
    mockProcessPayment.mockResolvedValue(mockResult)

    const result = await processPaymentAction({
      receiptId: '00000000-0000-4000-8200-000000000020', customerId: '00000000-0000-4000-8300-000000000030', cashClosureId: '00000000-0000-4000-8700-000000000070',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(mockRequireCashierAuth).toHaveBeenCalled()
    expect(mockProcessPayment).toHaveBeenCalledWith(expect.objectContaining({ receiptId: '00000000-0000-4000-8200-000000000020', cashierUserId: '00000000-0000-4000-8200-000000000002' }))
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireCashierAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await processPaymentAction({
      receiptId: '00000000-0000-4000-8200-000000000020', customerId: '00000000-0000-4000-8300-000000000030', cashClosureId: '00000000-0000-4000-8700-000000000070',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(result).toEqual({ success: false, error: 'Error al procesar el pago.' })
  })

  it('debería retornar error si processPayment falla', async () => {
    mockProcessPayment.mockRejectedValue(new Error('Caja cerrada'))

    const result = await processPaymentAction({
      receiptId: '00000000-0000-4000-8200-000000000020', customerId: '00000000-0000-4000-8300-000000000030', cashClosureId: '00000000-0000-4000-8700-000000000070',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(result).toEqual({ success: false, error: 'Error al procesar el pago.' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockProcessPayment.mockRejectedValue('string error')

    const result = await processPaymentAction({
      receiptId: '00000000-0000-4000-8200-000000000020', customerId: '00000000-0000-4000-8300-000000000030', cashClosureId: '00000000-0000-4000-8700-000000000070',
      amount: 50, paymentMethod: 'cash', receivedAmount: 50, changeAmount: 0
    })

    expect(result).toEqual({ success: false, error: 'Error al procesar el pago.' })
  })
})

describe('processBatchPaymentAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8200-000000000002' })
  })

  it('debería procesar lote y revalidar ruta', async () => {
    const mockResult = [{ id: '00000000-0000-4000-8400-000000000040', receiptId: '00000000-0000-4000-8200-000000000020', amount: 50 }]
    mockProcessBatchPayment.mockResolvedValue(mockResult)

    const result = await processBatchPaymentAction({
      payments: [{ receiptId: '00000000-0000-4000-8200-000000000020', amount: 50 }],
      customerId: '00000000-0000-4000-8300-000000000030', cashClosureId: '00000000-0000-4000-8700-000000000070', paymentMethod: 'cash'
    })

    expect(mockProcessBatchPayment).toHaveBeenCalledWith(expect.objectContaining({ cashierUserId: '00000000-0000-4000-8200-000000000002' }))
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si processBatchPayment falla', async () => {
    mockProcessBatchPayment.mockRejectedValue(new Error('Lote fallido'))

    const result = await processBatchPaymentAction({
      payments: [{ receiptId: '00000000-0000-4000-8200-000000000020', amount: 50 }],
      customerId: '00000000-0000-4000-8300-000000000030', cashClosureId: '00000000-0000-4000-8700-000000000070', paymentMethod: 'cash'
    })

    expect(result).toEqual({ success: false, error: 'Error al procesar el pago lote.' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockProcessBatchPayment.mockRejectedValue(null)

    const result = await processBatchPaymentAction({
      payments: [{ receiptId: '00000000-0000-4000-8200-000000000020', amount: 50 }],
      customerId: '00000000-0000-4000-8300-000000000030', cashClosureId: '00000000-0000-4000-8700-000000000070', paymentMethod: 'cash'
    })

    expect(result).toEqual({ success: false, error: 'Error al procesar el pago lote.' })
  })
})

describe('openClosureAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8200-000000000002' })
  })

  it('debería abrir caja y revalidar ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8700-000000000070', status: 'open' }
    mockOpenClosure.mockResolvedValue(mockResult)

    const result = await openClosureAction(200)

    expect(mockOpenClosure).toHaveBeenCalledWith('00000000-0000-4000-8200-000000000002', 200)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si openClosure falla', async () => {
    mockOpenClosure.mockRejectedValue(new Error('Ya tienes una caja abierta'))

    const result = await openClosureAction(200)

    expect(result).toEqual({ success: false, error: 'Error al abrir caja.' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockOpenClosure.mockRejectedValue(42)

    const result = await openClosureAction(200)

    expect(result).toEqual({ success: false, error: 'Error al abrir caja.' })
  })
})

describe('closeClosureAction', () => {
  const mockSelectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { cashier_id: '00000000-0000-4000-8200-000000000002' }, error: null }),
  }
  const mockSupabase = { from: vi.fn().mockReturnValue(mockSelectChain) }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: mockSupabase, userId: '00000000-0000-4000-8200-000000000002', role: 'admin' })
  })

  it('debería cerrar caja y revalidar ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8700-000000000070', status: 'closed' }
    mockCloseClosure.mockResolvedValue(mockResult)

    const result = await closeClosureAction('00000000-0000-4000-8700-000000000070')

    expect(mockCloseClosure).toHaveBeenCalledWith('00000000-0000-4000-8700-000000000070', '00000000-0000-4000-8200-000000000002')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si closeClosure falla', async () => {
    mockCloseClosure.mockRejectedValue(new Error('La caja ya está cerrada'))

    const result = await closeClosureAction('00000000-0000-4000-8700-000000000070')

    expect(result).toEqual({ success: false, error: 'Error al cerrar caja.' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockCloseClosure.mockRejectedValue('str')

    const result = await closeClosureAction('00000000-0000-4000-8700-000000000070')

    expect(result).toEqual({ success: false, error: 'Error al cerrar caja.' })
  })
})

describe('searchCashierCustomerAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockRpc = vi.fn().mockResolvedValue({ data: 0, error: null })
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: mockRpc }, userId: '00000000-0000-4000-8200-000000000002' })
    mockRecalculateCustomerDebt.mockResolvedValue(0)
  })

  it('debería buscar cliente por supply_number exacto y sus recibos abiertos', async () => {
    const mockCustomer = { id: '00000000-0000-4000-8300-000000000030', supply_number: '608132421', full_name: 'Juan' }
    mockGetBySupplyNumber.mockResolvedValue(mockCustomer)
    mockGetOpenReceiptsByCustomer.mockResolvedValue([{ id: '00000000-0000-4000-8200-000000000020' }])

    const result = await searchCashierCustomerAction('608132421')

    expect(mockGetBySupplyNumber).toHaveBeenCalledWith('608132421')
    expect(mockGetOpenReceiptsByCustomer).toHaveBeenCalledWith('00000000-0000-4000-8300-000000000030')
    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.customer).toEqual(mockCustomer)
    }
  })

  it('debería retornar data null si no se encuentran clientes', async () => {
    mockGetBySupplyNumber.mockResolvedValue(null)
    mockSearchCustomers.mockResolvedValue([])

    const result = await searchCashierCustomerAction('NOPE')

    expect(result).toEqual({ success: true, data: null })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireCashierAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await searchCashierCustomerAction('SUM-001')

expect(result).toEqual({ success: false, error: 'Error al buscar cliente.' })
    })

    it('debería manejar errores que no son instancias de Error', async () => {
      mockSearchCustomers.mockRejectedValue('fail')

    const result = await searchCashierCustomerAction('SUM-001')

    expect(result).toEqual({ success: false, error: 'Error al buscar cliente.' })
  })

  it('debería buscar por número de recibo como fallback cuando no hay cliente', async () => {
    const mockReceipt = { id: '00000000-0000-4000-8200-000000000020', receipt_number: 42, customer_id: '00000000-0000-4000-8300-000000000030', status: 'pending', customers: { supply_number: '608132421' } }
    const mockCustomer = { id: '00000000-0000-4000-8300-000000000030', supply_number: '608132421', full_name: 'Juan', current_debt: 50 }
    mockGetBySupplyNumber
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockCustomer)
    mockSearchCustomers.mockResolvedValue([])
    mockGetReceiptByNumber.mockResolvedValue(mockReceipt)
    const mockRpc = vi.fn().mockResolvedValue({ data: 50, error: null })
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: mockRpc }, userId: '00000000-0000-4000-8200-000000000002' })

    const result = await searchCashierCustomerAction('42')

    expect(mockGetReceiptByNumber).toHaveBeenCalledWith(42)
    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.receipts).toEqual([mockReceipt])
    }
  })

  it('debería retornar null si busca por número de recibo y no existe ni cliente ni recibo', async () => {
    mockGetBySupplyNumber.mockResolvedValue(null)
    mockSearchCustomers.mockResolvedValue([])
    mockGetReceiptByNumber.mockResolvedValue(null)
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: vi.fn().mockResolvedValue({ data: 0, error: null }) }, userId: '00000000-0000-4000-8200-000000000002' })

    const result = await searchCashierCustomerAction('999')

    expect(result).toEqual({ success: true, data: null })
  })

  it('debería encontrar cliente por supply number numérico vía getBySupplyNumber', async () => {
    const mockCustomer = { id: '00000000-0000-4000-8300-000000000030', supply_number: '608132421', full_name: 'Juan' }
    mockGetBySupplyNumber.mockResolvedValue(mockCustomer)
    mockGetOpenReceiptsByCustomer.mockResolvedValue([{ id: '00000000-0000-4000-8200-000000000020' }])

    const result = await searchCashierCustomerAction('608132421')

    expect(mockGetBySupplyNumber).toHaveBeenCalledWith('608132421')
    expect(mockGetReceiptByNumber).not.toHaveBeenCalled()
    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.customer).toEqual(mockCustomer)
    }
  })

  it('debería llamar getOpenReceiptsByCustomer una sola vez (sin deduplicación necesaria)', async () => {
    const mockCustomer = { id: '00000000-0000-4000-8300-000000000030', supply_number: '608132421', full_name: 'Juan' }
    mockGetBySupplyNumber.mockResolvedValue(mockCustomer)
    const openReceipts = [
      { id: '00000000-0000-4000-8200-000000000020', receipt_number: 1, status: 'pending' },
      { id: '00000000-0000-4000-8200-000000000021', receipt_number: 2, status: 'partial' },
    ]
    mockGetOpenReceiptsByCustomer.mockResolvedValue(openReceipts)
    const mockRpc = vi.fn().mockResolvedValue({ data: 0, error: null })
    mockRequireCashierAuth.mockResolvedValue({ supabase: { rpc: mockRpc }, userId: '00000000-0000-4000-8200-000000000002' })

    const result = await searchCashierCustomerAction('608132421')

    expect(mockGetOpenReceiptsByCustomer).toHaveBeenCalledWith('00000000-0000-4000-8300-000000000030')
    expect(mockGetOpenReceiptsByCustomer).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.receipts.length).toBe(2)
      expect(result.data.receipts.map((r: any) => r.id)).toEqual(['00000000-0000-4000-8200-000000000020', '00000000-0000-4000-8200-000000000021'])
    }
  })
})

describe('getCustomerPaymentsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8200-000000000002' })
  })

  it('debería obtener pagos del cliente', async () => {
    const mockPayments = [{ id: '00000000-0000-4000-8400-000000000040', amount: 50 }]
    mockGetPaymentsByCustomer.mockResolvedValue(mockPayments)

    const result = await getCustomerPaymentsAction('00000000-0000-4000-8300-000000000030')

    expect(result).toEqual({ success: true, data: mockPayments })
  })

  it('debería retornar error si falla', async () => {
    mockGetPaymentsByCustomer.mockRejectedValue(new Error('DB error'))

    const result = await getCustomerPaymentsAction('00000000-0000-4000-8300-000000000030')

    expect(result).toEqual({ success: false, error: 'Error al obtener pagos.' })
  })
})

describe('getPaymentVoucherDataAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8200-000000000002' })
  })

  it('debería obtener datos del comprobante', async () => {
    const mockData = { id: '00000000-0000-4000-8400-000000000040', amount: 50, receipts: {} }
    mockGetPaymentDetails.mockResolvedValue(mockData)

    const result = await getPaymentVoucherDataAction('00000000-0000-4000-8400-000000000040')

    expect(result).toEqual({ success: true, data: mockData })
  })

  it('debería retornar error si falla', async () => {
    mockGetPaymentDetails.mockRejectedValue(new Error('Not found'))

    const result = await getPaymentVoucherDataAction('00000000-0000-4000-8400-000000000040')

    expect(result).toEqual({ success: false, error: 'Error al obtener datos del comprobante.' })
  })
})

describe('getPaymentsByCashierAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireCashierAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8200-000000000002', role: 'admin' })
  })

  it('debería obtener pagos del cajero y mapear campos', async () => {
    const mockPayments = [{
      id: '00000000-0000-4000-8400-000000000040', amount: 50, payment_date: '2025-06-10', status: 'completed', reference: 'ref1',
      receipts: { receipt_number: '1', customers: { full_name: 'Juan', supply_number: 'SUM-001' } }
    }]
    mockGetPaymentsByCashier.mockResolvedValue(mockPayments)

    const result = await getPaymentsByCashierAction('00000000-0000-4000-8100-000000000001', {})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[0]).toEqual(expect.objectContaining({
        id: '00000000-0000-4000-8400-000000000040', amount: 50, customer_name: 'Juan', supply_number: 'SUM-001'
      }))
    }
  })

  it('debería manejar recibos sin datos', async () => {
    const mockPayments = [{ id: '00000000-0000-4000-8400-000000000040', amount: 50, payment_date: null, status: null, reference: null, receipts: null }]
    mockGetPaymentsByCashier.mockResolvedValue(mockPayments)

    const result = await getPaymentsByCashierAction('00000000-0000-4000-8100-000000000001', {})

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data[0].receipt_number).toBe('N/A')
      expect(result.data[0].customer_name).toBe('Desconocido')
    }
  })

  it('debería retornar error si falla', async () => {
    mockGetPaymentsByCashier.mockRejectedValue(new Error('DB error'))

    const result = await getPaymentsByCashierAction('00000000-0000-4000-8100-000000000001', {})

    expect(result).toEqual({ success: false, error: 'Error al obtener pagos.' })
  })
})
