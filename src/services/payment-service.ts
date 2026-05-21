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
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.paymentRepo = new PaymentRepository(supabaseClient)
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.cashClosureRepo = new CashClosureRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient
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
    const { receiptId, customerId, cashClosureId, amount } = data

    let cashierId = data.cashierUserId
    if (!cashierId) {
      const { data: { user } } = await this.supabase.auth.getUser()
      cashierId = user?.id || ''
    }
    if (!cashierId) throw new Error('Se requiere un usuario autenticado')

    const { data: paymentId, error: rpcError } = await this.supabase.rpc('process_payment', {
      p_receipt_id: receiptId,
      p_customer_id: customerId,
      p_cash_closure_id: cashClosureId,
      p_amount: amount,
      p_received_amount: data.receivedAmount,
      p_change_amount: data.changeAmount,
      p_cashier_id: cashierId,
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
        user_id: cashierId
      })
    } catch (e) { console.error('Audit log failed for processPayment:', e) }

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

    const cashierId = data.cashierUserId || closure.cashier_id
    const batchTotal = data.payments.reduce((s, p) => s + p.amount, 0)

    try {
      for (const item of data.payments) {
        const itemReceivedAmount = data.receivedAmount != null && data.receivedAmount >= batchTotal
          ? (item.amount / batchTotal) * data.receivedAmount
          : item.amount
        const itemChangeAmount = data.receivedAmount != null
          ? Math.max(0, itemReceivedAmount - item.amount)
          : 0

        const { data: paymentId, error: rpcError } = await this.supabase.rpc('process_payment', {
          p_receipt_id: item.receiptId,
          p_customer_id: data.customerId,
          p_cash_closure_id: data.cashClosureId,
          p_amount: item.amount,
          p_received_amount: Math.round(itemReceivedAmount * 100) / 100,
          p_change_amount: Math.round(itemChangeAmount * 100) / 100,
          p_cashier_id: cashierId,
        })

        if (rpcError) throw new Error(rpcError.message)
        if (!paymentId) throw new Error('Error al procesar el pago')

        completedPayments.push({ id: paymentId, receiptId: item.receiptId, amount: item.amount })

        try {
          await this.auditSvc.log({
            table_name: 'payments',
            record_id: paymentId,
            action: 'INSERT',
            new_data: { amount: item.amount, method: 'cash', receipt_id: item.receiptId },
            user_id: cashierId
          })
        } catch (e) { console.error('Audit log failed for batchPayment:', e) }
      }
      return completedPayments
    } catch (batchError) {
      const voidErrors: string[] = []
      for (const completed of completedPayments) {
        try {
          await this.voidPayment(completed.id, data.cashierUserId)
        } catch (voidErr: unknown) {
          voidErrors.push(`Pago ${completed.id}: ${voidErr instanceof Error ? voidErr.message : String(voidErr)}`)
        }
      }
      if (voidErrors.length > 0) {
        const originalMsg = batchError instanceof Error ? batchError.message : String(batchError)
        throw new Error(`${originalMsg} (ADVERTENCIA: ${voidErrors.length} pago(s) no pudieron revertirse — revise manualmente)`)
      }
      throw batchError
    }
  }

  async getPaymentsByCashier(cashierId: string, dateFilter?: { from?: string; to?: string }) {
    return await this.paymentRepo.getPaymentsByCashier(cashierId, dateFilter)
  }

  async voidPayment(paymentId: string, userId?: string) {
    let uid = userId
    if (!uid) {
      const { data: { user } } = await this.supabase.auth.getUser()
      uid = user?.id
    }
    if (!uid) throw new Error('Se requiere un usuario autenticado para anular pagos')

    const { error: rpcError } = await this.supabase.rpc('void_payment', {
      p_payment_id: paymentId,
      p_user_id: uid,
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
      } catch (e) { console.error('Audit log failed for voidPayment:', e) }
    }
  }

  async getAllPayments(filters?: { cashierId?: string; from?: string; to?: string }) {
    return await this.paymentRepo.getAllPayments(filters)
  }

  async getPaymentsByCustomer(customerId: string) {
    return await this.paymentRepo.getPaymentsByCustomer(customerId)
  }

  async getPaymentDetails(paymentId: string) {
    return await this.paymentRepo.getByIdWithDetails(paymentId)
  }
}

export function getPaymentService(supabaseClient: SupabaseClient<Database>) {
  return new PaymentService(supabaseClient)
}
