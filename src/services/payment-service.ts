import { PaymentRepository } from '@/repositories/payment-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { AuditService } from '@/services/audit-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class PaymentService {
  private paymentRepo: PaymentRepository
  private receiptRepo: ReceiptRepository
  private customerRepo: CustomerRepository
  private cashClosureRepo: CashClosureRepository
  private auditSvc: AuditService

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.paymentRepo = new PaymentRepository(supabaseClient)
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.cashClosureRepo = new CashClosureRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
  }

  async processPayment(data: {
    receiptId: string
    customerId: string
    cashClosureId: string
    amount: number
    paymentMethod: 'cash'
    receivedAmount: number
    changeAmount: number
  }) {
    const { receiptId, customerId, amount, cashClosureId } = data
    const closure = await this.cashClosureRepo.getById(cashClosureId)
    if (!closure?.cashier_id) throw new Error('Caja no valida para registrar pago')

    const receipt = await this.receiptRepo.getById(receiptId)
    if (!receipt) throw new Error('Recibo no encontrado')

    const remaining = receipt.total_amount - (receipt.paid_amount || 0)
    if (amount <= 0) throw new Error('El monto debe ser mayor a cero')
    if (amount > remaining) throw new Error('El monto excede el saldo pendiente')
    if (receipt.status === 'cancelled' || receipt.status === 'paid') {
      throw new Error('El recibo no permite nuevos pagos')
    }

    const payment = await this.paymentRepo.create({
      receipt_id: receiptId,
      customer_id: customerId,
      amount: amount,
      method: data.paymentMethod,
      reference: `PAY-${Date.now()}`,
      cashier_id: closure.cashier_id
    })

    const newPaidAmount = (receipt.paid_amount || 0) + amount
    const isFullyPaid = newPaidAmount >= receipt.total_amount

    await this.receiptRepo.update(receiptId, {
      paid_amount: newPaidAmount,
      status: isFullyPaid ? 'paid' : 'pending'
    })

    const customer = await this.customerRepo.getById(customerId)
    if (customer) {
      const newDebt = Math.max(0, (customer.current_debt || 0) - amount)
      await this.customerRepo.update(customerId, {
        current_debt: newDebt
      })
    }

  try {
    await this.auditSvc.log({
      table_name: 'payments',
      record_id: payment.id,
      action: 'INSERT',
      new_data: payment,
      user_id: closure.cashier_id
    })
  } catch {}

    return payment
  }

  async getPaymentsByCashier(cashierId: string, dateFilter?: { from?: string; to?: string }) {
    return await this.paymentRepo.getPaymentsByCashier(cashierId, dateFilter)
  }

  async getAllPayments(filters?: { cashierId?: string; from?: string; to?: string }) {
    return await this.paymentRepo.getAllPayments(filters)
  }
}

export const paymentService = new PaymentService()

export function getPaymentService(supabaseClient: SupabaseClient<Database>) {
  return new PaymentService(supabaseClient)
}
