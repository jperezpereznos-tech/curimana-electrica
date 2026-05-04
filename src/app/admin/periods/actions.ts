'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getPeriodService } from '@/services/period-service'
import { revalidatePath } from 'next/cache'

export async function closePeriodAction(id: string) {
  const { supabase, userId } = await requireAdminAuth()
  const periodService = getPeriodService(supabase)

  const result = await periodService.closePeriod(id, userId)
  revalidatePath('/admin/periods')
  revalidatePath('/admin/receipts')
  revalidatePath('/admin/customers')
  return result
}

export async function openNextPeriodAction() {
  const { supabase, userId } = await requireAdminAuth()
  const periodService = getPeriodService(supabase)

  const result = await periodService.createNextPeriod(userId)
  revalidatePath('/admin/periods')
  return result
}
