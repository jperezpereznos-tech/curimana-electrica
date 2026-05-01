import { ReceiptRepository } from '@/repositories/receipt-repository'
import { calculateEnergyAmount } from '@/lib/billing-utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class ReceiptService {
  private receiptRepo: ReceiptRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.receiptRepo = new ReceiptRepository(supabaseClient)
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

  async cancelReceipt(id: string, _reason: string) {
    return await this.receiptRepo.update(id, { status: 'cancelled' })
  }
}

export const receiptService = new ReceiptService()

export function getReceiptService(supabaseClient: SupabaseClient<Database>) {
  return new ReceiptService(supabaseClient)
}
