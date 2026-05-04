'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'

export async function getReadingsAdminAction(periodId?: string, needsReviewOnly?: boolean) {
  const { supabase } = await requireAdminAuth()
  const readingService = getReadingService(supabase)

  try {
    const readings = await readingService.getAllForAdmin(periodId, needsReviewOnly)
    return { data: readings, error: null }
  } catch (error: any) {
    return { data: [], error: error.message }
  }
}

export async function getPeriodsForFilterAction() {
  const { supabase } = await requireAdminAuth()
  const periodService = getPeriodService(supabase)

  try {
    const periods = await periodService.getAllPeriods()
    return { data: periods, error: null }
  } catch (error: any) {
    return { data: [], error: error.message }
  }
}

export async function updateReadingAction(readingId: string, data: {
  current_reading?: number
  previous_reading?: number
  needs_review?: boolean
  notes?: string
}) {
  const { supabase, userId } = await requireAdminAuth()
  const readingService = getReadingService(supabase)

  try {
    const updated = await readingService.updateReading(readingId, data, userId)
    return { data: updated, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
