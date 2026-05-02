'use server'

import { createClient } from '@/lib/supabase/server'
import { getCustomerService } from '@/services/customer-service'
import { getReceiptService } from '@/services/receipt-service'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return { supabase, userId: user.id }
}

export async function getTopDebtorsAction(limit: number = 5) {
  const { supabase } = await requireAuth()
  const customerService = getCustomerService(supabase)
  return await customerService.getTopDebtors(limit)
}

export async function getCustomersWithDebtAction() {
  const { supabase } = await requireAuth()
  const customerService = getCustomerService(supabase)
  return await customerService.getCustomersWithDebt()
}

export async function getPaidReceiptsAction() {
  const { supabase } = await requireAuth()
  const receiptService = getReceiptService(supabase)
  return await receiptService.getAllReceipts({ status: 'paid' })
}
