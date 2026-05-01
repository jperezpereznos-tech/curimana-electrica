import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '@/services/payment-service'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { PaymentRepository } from '@/repositories/payment-repository'
import { AuditService } from '@/services/audit-service'

vi.mock('@/repositories/receipt-repository')
vi.mock('@/repositories/customer-repository')
vi.mock('@/repositories/payment-repository')
vi.mock('@/repositories/cash-closure-repository')
vi.mock('@/services/audit-service')

describe('PaymentService - processPayment', () => {
  const service = new PaymentService()

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1' } as any)
  })

  it('debería marcar el recibo como PAGADO si el monto cubre el total', async () => {
    const mockReceipt = { id: 'r1', total_amount: 100, paid_amount: 0 }
    const mockCustomer = { id: 'c1', current_debt: 100 }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue(mockCustomer as any)
    vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(CustomerRepository.prototype, 'update').mockResolvedValue({} as any)
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
    expect(CustomerRepository.prototype.update).toHaveBeenCalledWith('c1', {
      current_debt: 0
    })
  })

  it('debería mantener el recibo como PENDIENTE si el pago es parcial', async () => {
    const mockReceipt = { id: 'r1', total_amount: 100, paid_amount: 0 }
    const mockCustomer = { id: 'c1', current_debt: 100 }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue(mockCustomer as any)
    vi.spyOn(PaymentRepository.prototype, 'create').mockResolvedValue({ id: 'p1' } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(CustomerRepository.prototype, 'update').mockResolvedValue({} as any)
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
      status: 'pending'
    })
    expect(CustomerRepository.prototype.update).toHaveBeenCalledWith('c1', {
      current_debt: 60
    })
  })
})
