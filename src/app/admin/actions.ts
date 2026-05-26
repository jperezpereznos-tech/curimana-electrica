'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'
import { topDebtorsLimitSchema } from '@/lib/validations/schemas'

export async function getTopDebtorsAction(limit: number = 5) {
  try {
    const { supabase } = await requireAdminAuth()
    topDebtorsLimitSchema.parse(limit)
    const customerService = getCustomerService(supabase)
    return await customerService.getTopDebtors(limit)
  } catch {
    return []
  }
}

export async function getCustomersWithDebtAction() {
  try {
    const { supabase } = await requireAdminAuth()
    const customerService = getCustomerService(supabase)
    return await customerService.getCustomersWithDebt()
  } catch {
    return []
  }
}

export async function getPaidReceiptsAction() {
  try {
    const { supabase } = await requireAdminAuth()
    const receiptService = getReceiptService(supabase)
    return await receiptService.getAllReceipts({ status: 'paid' })
  } catch {
    return []
  }
}
