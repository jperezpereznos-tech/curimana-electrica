import { ReceiptRepository } from '@/repositories/receipt-repository'
import { AuditService } from '@/services/audit-service'
import { calculateEnergyAmount } from '@/lib/billing-utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type TariffTier = { min_kwh: number; max_kwh: number | null; price_per_kwh: number }

export class ReceiptService {
  private receiptRepo: ReceiptRepository
  private auditSvc: AuditService
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient
  }

  async getAllReceipts(filters?: { periodId?: string; status?: string; customerId?: string }) {
    return await this.receiptRepo.getAllWithDetails(filters)
  }

  async getOpenReceiptsByCustomer(customerId: string) {
    return await this.receiptRepo.getOpenReceiptsByCustomer(customerId)
  }

  async getReceiptByNumber(receiptNumber: number) {
    return await this.receiptRepo.getByReceiptNumber(receiptNumber)
  }

  async getReceiptDetails(id: string) {
    return await this.receiptRepo.getByIdWithDetails(id)
  }

  calculateBreakdown(
    consumption: number,
    tiers: TariffTier[],
    fixedConcepts: { name: string; amount: number; type: string }[],
    previousDebt: number = 0
  ) {
    const energyAmount = calculateEnergyAmount(consumption, tiers)

    let totalFixed = 0
    const conceptsBreakdown = fixedConcepts.map(c => {
      let amount = 0
      if (c.type === 'fixed') amount = c.amount
      if (c.type === 'percentage') amount = (Math.round((energyAmount + totalFixed) * 100) / 100 * c.amount) / 100
      if (c.type === 'per_kwh') amount = consumption * c.amount

      const roundedAmount = Math.round(amount * 100) / 100
      totalFixed = Math.round((totalFixed + roundedAmount) * 100) / 100
      return { name: c.name, amount: roundedAmount }
    })

    const subtotal = Math.round((energyAmount + totalFixed) * 100) / 100
    const total = Math.round((subtotal + previousDebt) * 100) / 100

    return {
      energyAmount,
      conceptsBreakdown,
      fixedCharges: Math.round(totalFixed * 100) / 100,
      subtotal,
      previousDebt,
      totalAmount: total
    }
  }

  async recalculateCustomerDebt(customerId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('recalculate_customer_debt', {
      p_customer_id: customerId,
    })
    if (error) throw new Error('Error al recalcular deuda: ' + error.message)
    return (data as number) ?? 0
  }

  async cancelReceipt(id: string, reason: string, userId?: string) {
    const receipt = await this.receiptRepo.getById(id)
    if (!receipt) throw new Error('Recibo no encontrado')
    if (receipt.status === 'cancelled') throw new Error('El recibo ya está anulado')
    if ((receipt.paid_amount || 0) > 0.005) throw new Error('No se puede anular un recibo con pagos registrados. Anule los pagos primero.')

    const customerId = receipt.customer_id
    if (!customerId) throw new Error('Recibo sin cliente asociado')

    const updatedReceipt = await this.receiptRepo.update(id, { status: 'cancelled' })

    try {
      await this.recalculateCustomerDebt(customerId)
    } catch (e) {
      throw new Error('Recibo anulado pero error al recalcular deuda del cliente: ' + (e instanceof Error ? e.message : String(e)))
    }

    if (userId) {
      this.auditSvc.log({
        table_name: 'receipts',
        record_id: id,
        action: 'UPDATE',
        old_data: { status: receipt.status },
        new_data: { status: 'cancelled', reason },
        user_id: userId
      }).catch((e) => { console.error('Audit log failed for cancelReceipt:', e) })
    }

    return updatedReceipt
  }
}

export function getReceiptService(supabaseClient: SupabaseClient<Database>) {
  return new ReceiptService(supabaseClient)
}
