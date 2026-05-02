'use server'

import { createClient } from '@/lib/supabase/server'
import { getReceiptService } from '@/services/receipt-service'
import { revalidatePath } from 'next/cache'

export async function cancelReceiptAction(id: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const receiptService = getReceiptService(supabase)
  
  const result = await receiptService.cancelReceipt(id, reason, user?.id)
  revalidatePath('/admin/receipts')
  return result
}
