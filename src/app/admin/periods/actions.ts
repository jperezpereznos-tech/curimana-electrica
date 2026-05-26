'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getPeriodService } from '@/services/period-service'
import { revalidatePath } from 'next/cache'
import { uuidSchema } from '@/lib/validations/schemas'

export async function closePeriodAction(id: string) {
  try {
    uuidSchema.parse(id)
    const { supabase, userId } = await requireAdminAuth()
    const periodService = getPeriodService(supabase)
    const result = await periodService.closePeriod(id, userId)
    revalidatePath('/admin/periods')
    revalidatePath('/admin/receipts')
    revalidatePath('/admin/customers')
    return { success: true as const, data: result }
  } catch {
    return { success: false as const, error: 'Error al cerrar el periodo' }
  }
}

export async function openNextPeriodAction() {
  try {
    const { supabase, userId } = await requireAdminAuth()
    const periodService = getPeriodService(supabase)
    const result = await periodService.createNextPeriod(userId)
    revalidatePath('/admin/periods')
    return { success: true as const, data: result }
  } catch {
    return { success: false as const, error: 'Error al crear el siguiente periodo' }
  }
}
