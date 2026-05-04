'use server'

import { createClient } from '@/lib/supabase/server'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'

export async function getReadingsAdminAction(periodId?: string, needsReviewOnly?: boolean) {
  const supabase = await createClient()
  const readingService = getReadingService(supabase)

  try {
    const readings = await readingService.getAllForAdmin(periodId, needsReviewOnly)
    return { data: readings, error: null }
  } catch (error: any) {
    return { data: [], error: error.message }
  }
}

export async function getPeriodsForFilterAction() {
  const supabase = await createClient()
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
  const supabase = await createClient()
  const readingService = getReadingService(supabase)

  const { data: { user } } = await supabase.auth.getUser()

  try {
    const updated = await readingService.updateReading(readingId, data, user?.id)
    return { data: updated, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
