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
  const service = new PaymentService(mockSupabase)

  beforeEach(() => {
    vi.restoreAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0, error: null })
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1' } as any)
  })

  it('debería marcar el recibo como PAGADO si el monto cubre el total', async () => {
    const mockReceipt = { id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0
    })

    expect(ReceiptRepository.prototype.update).toHaveBeenCalledWith('r1', {
      paid_amount: 100,
      status: 'paid'
    })
    expect(mockSupabase.rpc).toHaveBeenCalledWith('adjust_customer_debt', {
      p_customer_id: 'c1',
      p_amount: -100
    })
  })

  it('debería mantener el recibo como PENDIENTE si el pago es parcial', async () => {
    const mockReceipt = { id: 'r1', total_amount: 100, paid_amount: 0, status: 'pending' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

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
    expect(mockSupabase.rpc).toHaveBeenCalledWith('adjust_customer_debt', {
      p_customer_id: 'c1',
      p_amount: -40
    })
  })
})