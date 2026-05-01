import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { PaymentRepository } from '@/repositories/payment-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class CashClosureService {
  private cashClosureRepo: CashClosureRepository
  private paymentRepo: PaymentRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.cashClosureRepo = new CashClosureRepository(supabaseClient)
    this.paymentRepo = new PaymentRepository(supabaseClient)
  }

  async getActiveClosure(userId: string) {
    return await this.cashClosureRepo.getActiveClosure(userId)
  }

  async openClosure(userId: string, initialAmount: number) {
    return await this.cashClosureRepo.create({
      cashier_id: userId,
      opening_amount: initialAmount,
      total_collected: 0,
      total_receipts: 0,
      status: 'open'
    })
  }

  async closeClosure(id: string) {
    const closure = await this.cashClosureRepo.getById(id)
    if (!closure) {
      throw new Error('No se encontro el cierre de caja')
    }

    if (!closure.cashier_id) {
      throw new Error('El cierre no tiene cajero asociado')
    }

    const payments = await this.paymentRepo.getPaymentsByCashier(closure.cashier_id)
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0)
    const receiptsCount = new Set(payments.map(p => p.receipt_id)).size

    return await this.cashClosureRepo.close(id, {
      closed_at: new Date().toISOString(),
      total_collected: totalCollected,
      total_receipts: receiptsCount
    })
  }
}

export const cashClosureService = new CashClosureService()

export function getCashClosureService(supabaseClient: SupabaseClient<Database>) {
  return new CashClosureService(supabaseClient)
}
