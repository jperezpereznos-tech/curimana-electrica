import { ReceiptRepository } from '@/repositories/receipt-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { AuditService } from '@/services/audit-service'
import { calculateEnergyAmount } from '@/lib/billing-utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class ReceiptService {
  private receiptRepo: ReceiptRepository
  private customerRepo: CustomerRepository
  private auditSvc: AuditService

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
  }

  async getAllReceipts(filters?: { periodId?: string; status?: string; supplyNumber?: string }) {
    return await this.receiptRepo.getAllWithDetails(filters)
  }

  async getReceiptDetails(id: string) {
    return await this.receiptRepo.getByIdWithDetails(id)
  }

  calculateBreakdown(
    consumption: number,
    tiers: any[],
    fixedConcepts: { name: string, amount: number, type: string }[],
    previousDebt: number = 0
  ) {
    const energyAmount = calculateEnergyAmount(consumption, tiers)

    let totalFixed = 0
    const conceptsBreakdown = fixedConcepts.map(c => {
      let amount = 0
      if (c.type === 'fixed') amount = c.amount
      if (c.type === 'percentage') amount = (energyAmount * c.amount) / 100
      if (c.type === 'per_kwh') amount = consumption * c.amount

      totalFixed += amount
      return { name: c.name, amount: Math.round(amount * 100) / 100 }
    })

    const subtotal = Math.round((energyAmount + totalFixed) * 100) / 100
    const igv = Math.round(subtotal * 0.18 * 100) / 100
    const total = Math.round((subtotal + igv + previousDebt) * 100) / 100

    return {
      energyAmount,
      conceptsBreakdown,
      fixedCharges: Math.round(totalFixed * 100) / 100,
      subtotal,
      igv,
      previousDebt,
      totalAmount: total
    }
  }

  async cancelReceipt(id: string, reason: string, userId?: string) {
    const receipt = await this.receiptRepo.getById(id)
    if (!receipt) throw new Error('Recibo no encontrado')
    if (receipt.status === 'cancelled') throw new Error('El recibo ya está anulado')
    if ((receipt.paid_amount || 0) > 0) throw new Error('No se puede anular un recibo con pagos registrados. Anule los pagos primero.')

    const customerId = receipt.customer_id
    if (!customerId) throw new Error('Recibo sin cliente asociado')

    const customer = await this.customerRepo.getById(customerId)

    const updatedReceipt = await this.receiptRepo.update(id, { status: 'cancelled' })

    if (customer) {
      const correctedDebt = Math.max(0, (customer.current_debt || 0) - (receipt.total_amount - (receipt.paid_amount || 0)))
      await this.customerRepo.update(customerId, {
        current_debt: correctedDebt
      })
    }

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'receipts',
          record_id: id,
          action: 'UPDATE',
          old_data: { status: receipt.status },
          new_data: { status: 'cancelled', reason },
          user_id: userId
        })
      } catch {}
    }

    return updatedReceipt
  }
}

export const receiptService = new ReceiptService()

export function getReceiptService(supabaseClient: SupabaseClient<Database>) {
  return new ReceiptService(supabaseClient)
}
