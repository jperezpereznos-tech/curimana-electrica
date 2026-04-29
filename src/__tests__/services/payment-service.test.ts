import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '@/services/payment-service'
import { receiptRepository } from '@/repositories/receipt-repository'
import { customerRepository } from '@/repositories/customer-repository'
import { paymentRepository } from '@/repositories/payment-repository'
import { cashClosureRepository } from '@/repositories/cash-closure-repository'
import { auditService } from '@/services/audit-service'

vi.mock('@/repositories/receipt-repository', () => ({
  receiptRepository: {
    getById: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  }
}))

vi.mock('@/repositories/customer-repository', () => ({
  customerRepository: {
    getById: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  }
}))

vi.mock('@/repositories/payment-repository', () => ({
  paymentRepository: {
    create: vi.fn((data) => Promise.resolve({ ...data, id: 'p1' })),
  }
}))

vi.mock('@/repositories/cash-closure-repository', () => ({
  cashClosureRepository: {
    getById: vi.fn().mockResolvedValue({ id: 'cl1', cashier_id: 'user1' }),
  }
}))

vi.mock('@/services/audit-service', () => ({
  auditService: {
    log: vi.fn().mockResolvedValue({}),
  }
}))

describe('PaymentService - processPayment', () => {
  const service = new PaymentService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería marcar el recibo como PAGADO si el monto cubre el total', async () => {
    const mockReceipt = { id: 'r1', total_amount: 100, paid_amount: 0 }
    const mockCustomer = { id: 'c1', current_debt: 100 }

    vi.mocked(receiptRepository.getById).mockResolvedValue(mockReceipt as any)
    vi.mocked(customerRepository.getById).mockResolvedValue(mockCustomer as any)

    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 100,
      paymentMethod: 'cash',
      receivedAmount: 100,
      changeAmount: 0
    })

    expect(receiptRepository.update).toHaveBeenCalledWith('r1', {
      paid_amount: 100,
      status: 'paid'
    })
    expect(customerRepository.update).toHaveBeenCalledWith('c1', {
      current_debt: 0
    })
  })

  it('debería mantener el recibo como PENDIENTE si el pago es parcial', async () => {
    const mockReceipt = { id: 'r1', total_amount: 100, paid_amount: 0 }
    const mockCustomer = { id: 'c1', current_debt: 100 }

    vi.mocked(receiptRepository.getById).mockResolvedValue(mockReceipt as any)
    vi.mocked(customerRepository.getById).mockResolvedValue(mockCustomer as any)

    await service.processPayment({
      receiptId: 'r1',
      customerId: 'c1',
      cashClosureId: 'cl1',
      amount: 40,
      paymentMethod: 'cash',
      receivedAmount: 50,
      changeAmount: 10
    })

    expect(receiptRepository.update).toHaveBeenCalledWith('r1', {
      paid_amount: 40,
      status: 'pending'
    })
    expect(customerRepository.update).toHaveBeenCalledWith('c1', {
      current_debt: 60
    })
  })
})
