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
    paymentMethod: 'cash'
    receivedAmount: number
    changeAmount: number
    cashierUserId?: string
  }) {
    const { receiptId, customerId, amount, cashClosureId } = data

    const closure = await this.cashClosureRepo.getById(cashClosureId)
    if (!closure?.cashier_id) throw new Error('Caja no valida para registrar pago')
    if (closure.status !== 'open') throw new Error('La caja esta cerrada. No se pueden registrar pagos.')

    const receipt = await this.receiptRepo.getById(receiptId)
    if (!receipt) throw new Error('Recibo no encontrado')

    const remaining = receipt.total_amount - (receipt.paid_amount || 0)
    if (amount <= 0) throw new Error('El monto debe ser mayor a cero')
    if (amount > remaining) throw new Error('El monto excede el saldo pendiente')
    if (receipt.status === 'cancelled' || receipt.status === 'paid') {
      throw new Error('El recibo no permite nuevos pagos')
    }

    const { data: paymentId, error: rpcError } = await this.supabase.rpc('process_payment', {
      p_receipt_id: receiptId,
      p_customer_id: customerId,
      p_cash_closure_id: cashClosureId,
      p_amount: amount,
      p_received_amount: data.receivedAmount,
      p_change_amount: data.changeAmount,
      p_cashier_id: closure.cashier_id,
    })

    if (rpcError) throw new Error(rpcError.message)
    if (!paymentId) throw new Error('Error al procesar el pago')

    const payment = await this.paymentRepo.getById(paymentId)

    try {
      await this.auditSvc.log({
        table_name: 'payments',
        record_id: paymentId,
        action: 'INSERT',
        new_data: { amount, method: 'cash', receipt_id: receiptId },
        user_id: data.cashierUserId || closure.cashier_id
      })
    } catch {}

    return payment
  }

  async processBatchPayment(data: {
    payments: { receiptId: string; amount: number }[]
    customerId: string
    cashClosureId: string
    paymentMethod: 'cash'
    receivedAmount?: number
    changeAmount?: number
    cashierUserId?: string
  }) {
    const closure = await this.cashClosureRepo.getById(data.cashClosureId)
    if (!closure?.cashier_id) throw new Error('Caja no valida para registrar pagos')
    if (closure.status !== 'open') throw new Error('La caja esta cerrada. No se pueden registrar pagos.')

    const completedPayments: { id: string; receiptId: string; amount: number }[] = []

    try {
      for (const item of data.payments) {
        const batchTotal = data.payments.reduce((s, p) => s + p.amount, 0)
        const itemReceivedAmount = data.receivedAmount != null && data.receivedAmount >= batchTotal
          ? (item.amount / batchTotal) * data.receivedAmount
          : item.amount
        const itemChangeAmount = data.receivedAmount != null
          ? Math.max(0, itemReceivedAmount - item.amount)
          : 0

        const result = await this.processPayment({
          receiptId: item.receiptId,
          customerId: data.customerId,
          cashClosureId: data.cashClosureId,
          amount: item.amount,
          paymentMethod: 'cash',
          receivedAmount: Math.round(itemReceivedAmount * 100) / 100,
          changeAmount: Math.round(itemChangeAmount * 100) / 100,
          cashierUserId: data.cashierUserId,
        })
        completedPayments.push({ id: result.id, receiptId: item.receiptId, amount: item.amount })
      }
      return completedPayments
    } catch (batchError) {
      for (const completed of completedPayments) {
        try {
          await this.voidPayment(completed.id, data.cashierUserId)
        } catch {}
      }
      throw batchError
    }
  }

  async getPaymentsByCashier(cashierId: string, dateFilter?: { from?: string; to?: string }) {
    return await this.paymentRepo.getPaymentsByCashier(cashierId, dateFilter)
  }

  async voidPayment(paymentId: string, userId?: string) {
    const { error: rpcError } = await this.supabase.rpc('void_payment', {
      p_payment_id: paymentId,
      p_user_id: userId || '',
    })

    if (rpcError) throw new Error(rpcError.message)

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'payments',
          record_id: paymentId,
          action: 'UPDATE',
          old_data: { status: 'completed' },
          new_data: { status: 'voided' },
          user_id: userId,
        })
      } catch {}
    }
  }

  async getAllPayments(filters?: { cashierId?: string; from?: string; to?: string }) {
    return await this.paymentRepo.getAllPayments(filters)
  }

  async getPaymentsByCustomer(customerId: string) {
    return await this.paymentRepo.getPaymentsByCustomer(customerId)
  }
}

export const paymentService = new PaymentService()

export function getPaymentService(supabaseClient: SupabaseClient<Database>) {
  return new PaymentService(supabaseClient)
}
