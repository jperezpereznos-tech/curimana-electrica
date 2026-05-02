'use server'

import { createClient } from '@/lib/supabase/server'
import { getPaymentService } from '@/services/payment-service'
import { revalidatePath } from 'next/cache'

export async function voidPaymentAction(paymentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const paymentService = getPaymentService(supabase)

  const result = await paymentService.voidPayment(paymentId, user?.id)
  revalidatePath('/admin/payments')
  return result
}
