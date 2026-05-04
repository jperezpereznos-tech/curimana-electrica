import { PaymentRepository } from '@/repositories/payment-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { AuditService } from '@/services/audit-service'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class PaymentService {
  private paymentRepo: PaymentRepository
  private receiptRepo: ReceiptRepository
  private customerRepo: CustomerRepository
  private cashClosureRepo: CashClosureRepository
  private auditSvc: AuditService
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.paymentRepo = new PaymentRepository(supabaseClient)
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.cashClosureRepo = new CashClosureRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient ?? createBrowserClient()
  }

  async processPayment(data: {
    receiptId: string
    customerId: string
    cashClosureId: string
    amount: number
    paymentMethod: 'cash' | 'transfer' | 'card'
    receivedAmount: number
    changeAmount: number
    cashierUserId?: string
    reference?: string
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
      reference: data.reference || `PAY-${Date.now()}`,
      cashier_id: closure.cashier_id
    })

    const newPaidAmount = (receipt.paid_amount || 0) + amount
    const isFullyPaid = newPaidAmount >= receipt.total_amount

    const receiptUpdate: Record<string, any> = {
      paid_amount: newPaidAmount,
      status: isFullyPaid ? 'paid' : 'partial',
    }
    if (isFullyPaid) {
      receiptUpdate.paid_at = new Date().toISOString()
    }

    await this.receiptRepo.update(receiptId, receiptUpdate)

    await this.supabase.rpc('adjust_customer_debt', {
      p_customer_id: customerId,
      p_amount: -amount
    })

    try {
      await this.auditSvc.log({
        table_name: 'payments',
        record_id: payment.id,
        action: 'INSERT',
        new_data: payment,
        user_id: data.cashierUserId || closure.cashier_id
      })
    } catch {}

    return payment
  }

  async processBatchPayment(data: {
    payments: { receiptId: string; amount: number }[]
    customerId: string
    cashClosureId: string
    paymentMethod: 'cash' | 'transfer' | 'card'
    reference?: string
    cashierUserId?: string
  }) {
    const closure = await this.cashClosureRepo.getById(data.cashClosureId)
    if (!closure?.cashier_id) throw new Error('Caja no valida para registrar pagos')

    const results = []
    for (const item of data.payments) {
      const result = await this.processPayment({
        receiptId: item.receiptId,
        customerId: data.customerId,
        cashClosureId: data.cashClosureId,
        amount: item.amount,
        paymentMethod: data.paymentMethod,
        receivedAmount: item.amount,
        changeAmount: 0,
        cashierUserId: data.cashierUserId,
        reference: data.reference,
      })
      results.push(result)
    }
    return results
  }

  async getPaymentsByCashier(cashierId: string, dateFilter?: { from?: string; to?: string }) {
    return await this.paymentRepo.getPaymentsByCashier(cashierId, dateFilter)
  }

  async voidPayment(paymentId: string, userId?: string) {
    const { data: payment, error } = await this.paymentRepo['supabase']
      .from('payments')
      .select('*, receipts!payments_receipt_id_fkey(id, paid_amount, total_amount, status, customer_id)')
      .eq('id', paymentId)
      .single()

    if (error || !payment) throw new Error('Pago no encontrado')
    if (payment.status === 'voided') throw new Error('El pago ya está anulado')

    const receipt = payment.receipts as { id: string, paid_amount: number, total_amount: number, status: string, customer_id: string | null }

    await this.paymentRepo.update(paymentId, {
      status: 'voided',
      voided_at: new Date().toISOString(),
    } as Database['public']['Tables']['payments']['Update'])

    if (receipt && receipt.customer_id) {
      const newPaidAmount = Math.max(0, (receipt.paid_amount || 0) - payment.amount)
      const newStatus = newPaidAmount <= 0 ? 'pending' : 'partial'

      await this.receiptRepo.update(receipt.id, {
        paid_amount: newPaidAmount,
        status: newStatus,
      })

      await this.supabase.rpc('adjust_customer_debt', {
        p_customer_id: receipt.customer_id,
        p_amount: payment.amount
      })
    }

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'payments',
          record_id: paymentId,
          action: 'UPDATE',
          old_data: { status: 'completed', amount: payment.amount },
          new_data: { status: 'voided' },
          user_id: userId,
        })
      } catch {}
    }
  }

  async getAllPayments(filters?: { cashierId?: string; from?: string; to?: string }) {
    return await this.paymentRepo.getAllPayments(filters)
  }
}

export const paymentService = new PaymentService()

export function getPaymentService(supabaseClient: SupabaseClient<Database>) {
  return new PaymentService(supabaseClient)
}
