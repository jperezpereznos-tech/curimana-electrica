import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '@/services/payment-service'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
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

function createMockSupabase() {
  return {
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null })
  } as unknown as SupabaseClient<Database>
}

describe('PaymentService - processPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0, error: null })
  })

  it('debería marcar el recibo como PAGADO si el monto cubre el total', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0
    })

    const updateCall = (ReceiptRepository.prototype.update as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(updateCall[0]).toBe('r1')
    expect(updateCall[1]).toMatchObject({ paid_amount: 100, status: 'paid' })
    expect(updateCall[1].paid_at).toBeDefined()
    expect(mockSupabase.rpc).toHaveBeenCalledWith('adjust_customer_debt', {
      p_customer_id: 'c1',
      p_amount: -100
    })
  })

  it('debería mantener el recibo como PARCIAL si el pago es parcial', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 40,
      paymentMethod: 'cash',
      receivedAmount: 50,
      changeAmount: 10
    })

    expect(ReceiptRepository.prototype.update).toHaveBeenCalledWith('r1', {
      paid_amount: 40,
      status: 'partial'
    })
  })

  it('debería rechazar pagos si la caja está cerrada', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'closed' } as any)

    const service = new PaymentService(mockSupabase)
    await expect(service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0
    })).rejects.toThrow('La caja está cerrada')
  })

  it('debería pasar receivedAmount y changeAmount y cashClosureId al crear el pago', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' } as any)
    const createSpy = vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const service = new PaymentService(mockSupabase)
    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 150,
      changeAmount: 50
    })

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cash_closure_id: 'cl1',
        received_amount: 150,
        change_amount: 50,
      })
    )
  })
})

describe('PaymentService - voidPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0, error: null })
  })

  it('debería limpiar paid_at al anular un pago que vuelve a pending', async () => {
    const mockPayment = {
      id: 'p1',
      amount: 100,
      status: 'completed',
      receipts: { id: 'r1', paid_amount: 100, total_amount: 100, status: 'paid', customer_id: 'c1' }
    }

    vi.spyOn(PaymentRepository.prototype, 'update').mockResolvedValue({} as any)
    const receiptUpdateSpy = vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)

    const service = new PaymentService(mockSupabase)
    service['paymentRepo']['supabase'] = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPayment, error: null })
      })
    } as any

    await service.voidPayment('p1', 'user1')

    expect(receiptUpdateSpy).toHaveBeenCalledWith('r1',
      expect.objectContaining({ paid_amount: 0, status: 'pending', paid_at: null })
    )
  })
})

describe('PaymentService - processBatchPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0, error: null })
  })

  it('debería hacer rollback de pagos completados si uno falla', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open' } as any)

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockImplementation(async (id: string) => {
      if (id === 'r1') return { id: 'r1', total_amount: 50, paid_amount: 0, status: 'pending' } as any
      throw new Error('El recibo no permite nuevos pagos')
    })
    vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const mockPaymentForVoid = {
      id: 'p1',
      amount: 50,
      status: 'completed',
      receipts: { id: 'r1', paid_amount: 50, total_amount: 50, status: 'paid', customer_id: 'c1' }
    }

    vi.spyOn(PaymentRepository.prototype, 'update').mockResolvedValue({} as any)

    const service = new PaymentService(mockSupabase)
    service['paymentRepo']['supabase'] = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPaymentForVoid, error: null })
      })
    } as any

    await expect(service.processBatchPayment({
      payments: [{ receiptId: 'r1', amount: 50 }, { receiptId: 'r2', amount: 60 }],
      customerId: 'c1',
      cashClosureId: 'cl1',
      paymentMethod: 'cash',
      cashierUserId: 'user1',
    })).rejects.toThrow()
  })
})
