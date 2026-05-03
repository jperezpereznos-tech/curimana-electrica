'use server'

import { createClient } from '@/lib/supabase/server'
import { getPeriodService } from '@/services/period-service'
import { revalidatePath } from 'next/cache'

export async function closePeriodAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const periodService = getPeriodService(supabase)
  
  const result = await periodService.closePeriod(id, user?.id)
  revalidatePath('/admin/periods')
  revalidatePath('/admin/receipts')
  revalidatePath('/admin/customers')
  return result
}

export async function openNextPeriodAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const periodService = getPeriodService(supabase)

  const result = await periodService.createNextPeriod(user?.id)
  revalidatePath('/admin/periods')
  return result
}
