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

function createMockSupabase() {
  return {
    rpc: vi.fn().mockResolvedValue({ data: 'payment-id-1', error: null })
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
    })).rejects.toThrow()
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
})

describe('PaymentService - voidPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })
  })

  it('deberia llamar a void_payment RPC', async () => {
    const service = new PaymentService(mockSupabase)

    await service.voidPayment('p1', 'user1')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('void_payment', {
      p_payment_id: 'p1',
      p_user_id: 'user1',
    })
  })

  it('deberia lanzar error si la RPC falla', async () => {
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: 'El pago ya esta anulado' } })

    const service = new PaymentService(mockSupabase)
    await expect(service.voidPayment('p1', 'user1')).rejects.toThrow('El pago ya esta anulado')
  })
})

describe('PaymentService - processBatchPayment', () => {
  const mockSupabase = createMockSupabase()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 'payment-id-1', error: null })
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
})
