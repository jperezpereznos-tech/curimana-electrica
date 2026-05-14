'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'
import { revalidatePath } from 'next/cache'
import { uuidSchema, updateReadingSchema } from '@/lib/validations/schemas'

export async function getReadingsAdminAction(periodId?: string, needsReviewOnly?: boolean) {
  try {
    if (periodId) uuidSchema.parse(periodId)
    const { supabase } = await requireAdminAuth()
    const readingService = getReadingService(supabase)
    const data = await readingService.getAllForAdmin(periodId, needsReviewOnly)
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener lecturas', data: [] }
  }
}

export async function getPeriodsForFilterAction() {
  try {
    const { supabase } = await requireAdminAuth()
    const periodService = getPeriodService(supabase)
    const data = await periodService.getAllPeriods()
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener periodos', data: [] }
  }
}

export async function updateReadingAction(readingId: string, data: unknown) {
  try {
    uuidSchema.parse(readingId)
    const parsed = updateReadingSchema.parse(data)
    const { supabase, userId } = await requireAdminAuth()
    const readingService = getReadingService(supabase)
    const updated = await readingService.updateReading(readingId, parsed, userId)
    revalidatePath('/admin/readings')
    return { success: true as const, data: updated }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al actualizar lectura' }
  }
}
