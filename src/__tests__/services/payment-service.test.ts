import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '@/services/payment-service'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { PaymentRepository } from '@/repositories/payment-repository'
import { AuditService } from '@/services/audit-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

vi.mock('@/repositories/receipt-repository')
vi.mock('@/repositories/customer-repository')
vi.mock('@/repositories/payment-repository')
vi.mock('@/repositories/cash-closure-repository')
vi.mock('@/services/audit-service')

function createMockSupabase(opts?: { userId?: string | null }) {
  return {
    rpc: vi.fn().mockResolvedValue({ data: 'payment-id-1', error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: opts?.userId ? { id: opts.userId } : null } })
    }
  } as unknown as SupabaseClient<Database>
}

describe('PaymentService - processPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'payment-id-1', error: null })
  })

  it('deberia llamar a process_payment RPC con los parametros correctos', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'getById').mockResolvedValue({ id: 'payment-id-1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 150,
      changeAmount: 50,
      cashierUserId: 'user1',
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith('process_payment', {
      p_receipt_id: 'r1',
      p_customer_id: 'c1',
      p_cash_closure_id: 'cl1',
      p_amount: 100,
      p_received_amount: 150,
      p_change_amount: 50,
      p_cashier_id: 'user1',
    })
  })

  it('deberia rechazar pagos si la caja esta cerrada', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'closed' } as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0,
    })).rejects.toThrow('La caja esta cerrada')
  })

  it('deberia rechazar si la caja no tiene cashier_id', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: null, status: 'open' } as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0,
    })).rejects.toThrow('Caja no valida')
  })

  it('deberia lanzar error si la RPC falla', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: 'El monto excede el saldo pendiente' } })

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 200,
      paymentMethod: 'cash',
      receivedAmount: 200,
      changeAmount: 0,
    })).rejects.toThrow('El monto excede el saldo pendiente')
  })

  it('deberia lanzar error si el recibo no existe', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(null as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'missing',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0,
    })).rejects.toThrow('Recibo no encontrado')
  })

  it('deberia lanzar error si el monto es cero o negativo', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 0,
      paymentMethod: 'cash',
      receivedAmount: 0,
      changeAmount: 0,
    })).rejects.toThrow('El monto debe ser mayor a cero')
  })

  it('deberia lanzar error si el recibo esta cancelado', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'cancelled' } as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0,
    })).rejects.toThrow('El recibo no permite nuevos pagos')
  })

  it('deberia lanzar error si el recibo ya esta pagado', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 50, status: 'paid' } as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 50,
      paymentMethod: 'cash',
      receivedAmount: 50,
      changeAmount: 0,
    })).rejects.toThrow('El recibo no permite nuevos pagos')
  })

  it('deberia lanzar error si RPC retorna data null sin error', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0,
    })).rejects.toThrow('Error al procesar el pago')
  })

  it('deberia registrar auditoria si cashierUserId se proporciona', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'getById').mockResolvedValue({ id: 'payment-id-1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0,
      cashierUserId: 'admin1',
    })

    expect(AuditService.prototype.log).toHaveBeenCalledWith({
      table_name: 'payments',
      record_id: 'payment-id-1',
      action: 'INSERT',
      new_data: { amount: 100, method: 'cash', receipt_id: 'r1' },
      user_id: 'admin1',
    })
  })

  it('deberia usar cashier_id de la caja si cashierUserId no se proporciona', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'cashier1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'getById').mockResolvedValue({ id: 'payment-id-1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0,
    })

    expect(AuditService.prototype.log).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'cashier1' })
    )
  })

  it('deberia permitir pago parcial de un recibo', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'getById').mockResolvedValue({ id: 'p1', amount: 50 } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    const result = await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 50,
      paymentMethod: 'cash',
      receivedAmount: 50,
      changeAmount: 0,
    })

    expect(result).toEqual({ id: 'p1', amount: 50 })
  })
})

describe('PaymentService - voidPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
  })

  it('deberia llamar a void_payment RPC con p_user_id cuando se pasa', async () => {
    const service = new PaymentService(mockSupabase)

    await service.voidPayment('p1', 'user1')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('void_payment', {
      p_payment_id: 'p1',
      p_user_id: 'user1',
    })
  })

  it('deberia lanzar error si no hay userId ni auth', async () => {
    const service = new PaymentService(mockSupabase)

    // No pasar userId y mock sin auth
    await expect(service.voidPayment('p1')).rejects.toThrow('Se requiere un usuario autenticado')
  })

  it('deberia lanzar error si la RPC falla', async () => {
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: 'El pago ya esta anulado' } })

    const service = new PaymentService(mockSupabase)
    await expect(service.voidPayment('p1', 'user1')).rejects.toThrow('El pago ya esta anulado')
  })

  it('deberia registrar auditoria si se pasa userId', async () => {
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.voidPayment('p1', 'admin1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith({
      table_name: 'payments',
      record_id: 'p1',
      action: 'UPDATE',
      old_data: { status: 'completed' },
      new_data: { status: 'voided' },
      user_id: 'admin1',
    })
  })

  it('no deberia registrar auditoria si no se pasa userId', async () => {
    // Configurar auth mock para que devuelva un usuario válido
    mockSupabase.auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auto-user' } } })
    } as any

    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.voidPayment('p1')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })
})

describe('PaymentService - processBatchPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'payment-id-1', error: null })
  })

  it('deberia procesar multiples pagos exitosamente', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById')
      .mockResolvedValueOnce({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
      .mockResolvedValueOnce({ id: 'r2', total_amount: 80, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'getById')
      .mockResolvedValueOnce({ id: 'p1', amount: 50 } as any)
      .mockResolvedValueOnce({ id: 'p2', amount: 30 } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: 'p1', error: null })
      .mockResolvedValueOnce({ data: 'p2', error: null })

    const service = new PaymentService(mockSupabase)
    const result = await service.processBatchPayment({
      payments: [{ receiptId: 'r1', amount: 50 }, { receiptId: 'r2', amount: 30 }],
      customerId: 'c1',
      cashClosureId: 'cl1',
      paymentMethod: 'cash',
      cashierUserId: 'user1',
    })

    expect(result).toEqual([
      { id: 'p1', receiptId: 'r1', amount: 50 },
      { id: 'p2', receiptId: 'r2', amount: 30 },
    ])
  })

  it('deberia hacer rollback de pagos completados si uno falla', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 50, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'getById').mockResolvedValue({ id: 'payment-id-1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ data: 'payment-id-1', error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'El recibo no permite nuevos pagos' } })
      .mockResolvedValueOnce({ data: null, error: null })

    const service = new PaymentService(mockSupabase)

    await expect(service.processBatchPayment({
      payments: [{ receiptId: 'r1', amount: 50 }, { receiptId: 'r2', amount: 60 }],
      customerId: 'c1',
      cashClosureId: 'cl1',
      paymentMethod: 'cash',
      cashierUserId: 'user1',
    })).rejects.toThrow()
  })

  it('deberia rechazar si la caja esta cerrada', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'closed' } as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processBatchPayment({
      payments: [{ receiptId: 'r1', amount: 50 }],
      customerId: 'c1',
      cashClosureId: 'cl1',
      paymentMethod: 'cash',
    })).rejects.toThrow('La caja esta cerrada')
  })
})

describe('PaymentService - getAllPayments', () => {
  const mockSupabase = createMockSupabase()
  const service = new PaymentService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deberia delegar al repositorio sin filtros', async () => {
    const mockPayments = [{ id: 'p1' }, { id: 'p2' }]
    vi.spyOn(PaymentRepository.prototype, 'getAllPayments').mockResolvedValue(mockPayments as any)

    const result = await service.getAllPayments()

    expect(PaymentRepository.prototype.getAllPayments).toHaveBeenCalledWith(undefined)
    expect(result).toEqual(mockPayments)
  })

  it('deberia pasar filtros al repositorio', async () => {
    const filters = { cashierId: 'user1', from: '2025-01-01', to: '2025-01-31' }
    vi.spyOn(PaymentRepository.prototype, 'getAllPayments').mockResolvedValue([] as any)

    await service.getAllPayments(filters)

    expect(PaymentRepository.prototype.getAllPayments).toHaveBeenCalledWith(filters)
  })
})

describe('PaymentService - getPaymentsByCashier', () => {
  const mockSupabase = createMockSupabase()
  const service = new PaymentService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deberia delegar al repositorio con filtros de fecha', async () => {
    const mockPayments = [{ id: 'p1', cashier_id: 'user1' }]
    vi.spyOn(PaymentRepository.prototype, 'getPaymentsByCashier').mockResolvedValue(mockPayments as any)

    const result = await service.getPaymentsByCashier('user1', { from: '2025-01-01', to: '2025-01-31' })

    expect(PaymentRepository.prototype.getPaymentsByCashier).toHaveBeenCalledWith('user1', { from: '2025-01-01', to: '2025-01-31' })
    expect(result).toEqual(mockPayments)
  })

  it('deberia funcionar sin filtros de fecha', async () => {
    vi.spyOn(PaymentRepository.prototype, 'getPaymentsByCashier').mockResolvedValue([] as any)

    await service.getPaymentsByCashier('user1')

    expect(PaymentRepository.prototype.getPaymentsByCashier).toHaveBeenCalledWith('user1', undefined)
  })
})

describe('PaymentService - getPaymentsByCustomer', () => {
  const mockSupabase = createMockSupabase()
  const service = new PaymentService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deberia delegar al repositorio con el customerId', async () => {
    const mockPayments = [{ id: 'p1', customer_id: 'c1' }]
    vi.spyOn(PaymentRepository.prototype, 'getPaymentsByCustomer').mockResolvedValue(mockPayments as any)

    const result = await service.getPaymentsByCustomer('c1')

    expect(PaymentRepository.prototype.getPaymentsByCustomer).toHaveBeenCalledWith('c1')
    expect(result).toEqual(mockPayments)
  })
})

describe('PaymentService - getPaymentDetails', () => {
  const mockSupabase = createMockSupabase()
  const service = new PaymentService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deberia delegar al repositorio con el paymentId', async () => {
    const mockDetail = { id: 'p1', amount: 100, receipts: { receipt_number: 1 }, cashier: { full_name: 'Cajero1' } }
    vi.spyOn(PaymentRepository.prototype, 'getByIdWithDetails').mockResolvedValue(mockDetail as any)

    const result = await service.getPaymentDetails('p1')

    expect(PaymentRepository.prototype.getByIdWithDetails).toHaveBeenCalledWith('p1')
    expect(result).toEqual(mockDetail)
  })

  it('deberia propagar error si el repositorio falla', async () => {
    vi.spyOn(PaymentRepository.prototype, 'getByIdWithDetails').mockRejectedValue(new Error('Not found'))

    await expect(service.getPaymentDetails('missing')).rejects.toThrow('Not found')
  })
})
