'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getReceiptService } from '@/services/receipt-service'
import { getConceptService } from '@/services/concept-service'
import { revalidatePath } from 'next/cache'
import { cancelReceiptSchema } from '@/lib/validations/schemas'

export async function cancelReceiptAction(id: string, reason: string) {
  try {
    const parsed = cancelReceiptSchema.parse({ id, reason })
    const { supabase, userId } = await requireAdminAuth()
    const receiptService = getReceiptService(supabase)
    const result = await receiptService.cancelReceipt(parsed.id, parsed.reason, userId)
    revalidatePath('/admin/receipts')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al anular el recibo' }
  }
}

export async function getConceptsForBreakdownAction() {
  try {
    const { supabase } = await requireAdminAuth()
    const conceptService = getConceptService(supabase)
    const data = await conceptService.getActiveConcepts()
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener conceptos', data: [] }
  }
}
