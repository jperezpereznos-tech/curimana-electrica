'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getReceiptService } from '@/services/receipt-service'
import { getConceptService } from '@/services/concept-service'
import { revalidatePath } from 'next/cache'

export async function cancelReceiptAction(id: string, reason: string) {
  const { supabase, userId } = await requireAdminAuth()
  const receiptService = getReceiptService(supabase)

  const result = await receiptService.cancelReceipt(id, reason, userId)
  revalidatePath('/admin/receipts')
  return result
}

export async function getConceptsForBreakdownAction() {
  const { supabase } = await requireAdminAuth()
  const conceptService = getConceptService(supabase)
  return await conceptService.getActiveConcepts()
}
