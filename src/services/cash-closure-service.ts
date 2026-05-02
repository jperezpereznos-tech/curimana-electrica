import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { PaymentRepository } from '@/repositories/payment-repository'
import { AuditService } from '@/services/audit-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class CashClosureService {
  private cashClosureRepo: CashClosureRepository
  private paymentRepo: PaymentRepository
  private auditSvc: AuditService

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.cashClosureRepo = new CashClosureRepository(supabaseClient)
    this.paymentRepo = new PaymentRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
  }

  async getActiveClosure(userId: string) {
    return await this.cashClosureRepo.getActiveClosure(userId)
  }

  async openClosure(userId: string, initialAmount: number) {
    const existing = await this.cashClosureRepo.getActiveClosure(userId)
    if (existing) {
      throw new Error('Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.')
    }

    const closure = await this.cashClosureRepo.create({
      cashier_id: userId,
      opening_amount: initialAmount,
      total_collected: 0,
      total_receipts: 0,
      status: 'open'
    })

    try {
      await this.auditSvc.log({
        table_name: 'cash_closures',
        record_id: closure.id,
        action: 'INSERT',
        new_data: { opening_amount: initialAmount, status: 'open' },
        user_id: userId
      })
    } catch {}

    return closure
  }

  async closeClosure(id: string, userId?: string) {
    const closure = await this.cashClosureRepo.getById(id)
    if (!closure) {
      throw new Error('No se encontro el cierre de caja')
    }

    if (closure.status !== 'open') {
      throw new Error('La caja ya está cerrada')
    }

    if (!closure.cashier_id) {
      throw new Error('El cierre no tiene cajero asociado')
    }

    const payments = await this.paymentRepo.getPaymentsByCashier(closure.cashier_id, {
      from: closure.created_at ?? undefined,
      to: new Date().toISOString()
    })
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
    const receiptsCount = new Set(payments.map(p => p.receipt_id)).size

    const result = await this.cashClosureRepo.close(id, {
      closed_at: new Date().toISOString(),
      total_collected: totalCollected,
      total_receipts: receiptsCount
    })

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'cash_closures',
          record_id: id,
          action: 'UPDATE',
          new_data: { status: 'closed', total_collected: totalCollected, total_receipts: receiptsCount },
          user_id: userId
        })
      } catch {}
    }

    return result
  }
}

export const cashClosureService = new CashClosureService()

export function getCashClosureService(supabaseClient: SupabaseClient<Database>) {
  return new CashClosureService(supabaseClient)
}
