'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'

export async function getTopDebtorsAction(limit: number = 5) {
  const { supabase } = await requireAdminAuth()
  const customerService = getCustomerService(supabase)
  return await customerService.getTopDebtors(limit)
}

export async function getCustomersWithDebtAction() {
  const { supabase } = await requireAdminAuth()
  const customerService = getCustomerService(supabase)
  return await customerService.getCustomersWithDebt()
}

export async function getPaidReceiptsAction() {
  const { supabase } = await requireAdminAuth()
  const receiptService = getReceiptService(supabase)
  return await receiptService.getAllReceipts({ status: 'paid' })
}
