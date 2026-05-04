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

async function getAssignedSectorId(userId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('assigned_sector_id')
    .eq('id', userId)
    .single()
  return profile?.assigned_sector_id || null
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

export async function getReaderAssignedSectorIdAction() {
  const { supabase, userId } = await requireAuth()
  return await getAssignedSectorId(userId, supabase)
}

export async function getReaderDashboardDataAction() {
  const { supabase, userId } = await requireAuth()
  const readingService = getReadingService(supabase)
  const periodService = getPeriodService(supabase)
  const sectorId = await getAssignedSectorId(userId, supabase)

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
    } : null,
    sectorId
  }
}

export async function searchReaderCustomersAction(query: string) {
  const { supabase, userId } = await requireAuth()
  const sectorId = await getAssignedSectorId(userId, supabase)
  const customerService = getCustomerService(supabase)
  return await customerService.searchCustomers(query, sectorId || undefined)
}

export async function getLatestReadingAction(customerId: string) {
  const { supabase } = await requireAuth()
  const readingService = getReadingService(supabase)
  const reading = await readingService.getLatestReading(customerId)
  return reading
}

export async function registerReadingAction(data: {
  customer_id: string
  billing_period_id: string
  previous_reading: number
  current_reading: number
  reading_date: string
  notes?: string
  photo_url?: string
}) {
  const { supabase, userId } = await requireAuth()
  const sectorId = await getAssignedSectorId(userId, supabase)

  const { data: customer } = await supabase
    .from('customers')
    .select('sector_id')
    .eq('id', data.customer_id)
    .single()

  if (sectorId && customer?.sector_id && customer.sector_id !== sectorId) {
    throw new Error('No puede registrar lecturas de suministros fuera de su sector asignado')
  }

  const readingService = getReadingService(supabase)
  return await readingService.registerReading(data, userId)
}
