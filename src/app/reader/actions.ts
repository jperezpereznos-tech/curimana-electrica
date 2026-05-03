'use server'

import { createClient } from '@/lib/supabase/server'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'
import { getCustomerService } from '@/services/customer-service'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return { supabase, userId: user.id }
}

export async function getReaderAssignedSectorAction() {
  const { supabase, userId } = await requireAuth()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('assigned_sector_id, sectors:id!profiles_assigned_sector_id_fkey(id, name, code)')
    .eq('id', userId)
    .single()

  if (error) throw error
  return profile as any
}

export async function getReaderDashboardDataAction() {
  const { supabase } = await requireAuth()
  const readingService = getReadingService(supabase)
  const periodService = getPeriodService(supabase)

  const [syncedCount, activeCustomers, period] = await Promise.all([
    readingService.getTodayReadingsCount(),
    readingService.getActiveCustomersCount(),
    periodService.getCurrentPeriod()
  ])

  return {
    syncedCount,
    activeCustomers,
    period: period ? {
      name: period.name,
      endDate: period.end_date
    } : null
  }
}

export async function searchReaderCustomersAction(query: string) {
  const { supabase } = await requireAuth()
  const customerService = getCustomerService(supabase)
  return await customerService.searchCustomers(query)
}

export async function getLatestReadingAction(customerId: string) {
  const { supabase } = await requireAuth()
  const readingService = getReadingService(supabase)
  const reading = await readingService.getLatestReading(customerId)
  return reading
}
