'use server'

import { requireReaderAuth } from '@/lib/auth/server-reader-auth'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'
import { getCustomerService } from '@/services/customer-service'

type AuthedSupabase = Awaited<ReturnType<typeof requireReaderAuth>>['supabase']

async function getAssignedSectorId(userId: string, supabase: AuthedSupabase) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('assigned_sector_id')
    .eq('id', userId)
    .single()
  return profile?.assigned_sector_id || null
}

type SectorProfile = {
  assigned_sector_id: string | null
  sectors: { id: string; name: string; code: string } | null
}

export async function getReaderAssignedSectorAction(): Promise<SectorProfile> {
  const { supabase, userId } = await requireReaderAuth()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('assigned_sector_id, sectors:id!profiles_assigned_sector_id_fkey(id, name, code)')
    .eq('id', userId)
    .single()

  if (error) throw error
  return profile as unknown as SectorProfile
}

export async function getReaderAssignedSectorIdAction() {
  const { supabase, userId } = await requireReaderAuth()
  return await getAssignedSectorId(userId, supabase)
}

export async function getReaderDashboardDataAction() {
  const { supabase, userId } = await requireReaderAuth()
  const readingService = getReadingService(supabase)
  const periodService = getPeriodService(supabase)
  const sectorId = await getAssignedSectorId(userId, supabase)

  const [syncedCount, period, sectorResult] = await Promise.all([
    readingService.getTodayReadingsCount(),
    periodService.getCurrentPeriod(),
    supabase
      .from('profiles')
      .select('assigned_sector_id, sectors:assigned_sector_id(id, name, code)')
      .eq('id', userId)
      .single()
  ])

  let activeCustomers = 0
  if (sectorId) {
    activeCustomers = await readingService.getActiveCustomersCount()
  }

  const sectorProfile = sectorResult.data as SectorProfile | null

  return {
    syncedCount,
    activeCustomers,
    period: period ? {
      name: period.name,
      endDate: period.end_date
    } : null,
    sectorId,
    sectorName: sectorProfile?.sectors?.name || null
  }
}

export async function searchReaderCustomersAction(query: string) {
  const { supabase, userId } = await requireReaderAuth()
  const sectorId = await getAssignedSectorId(userId, supabase)
  if (!sectorId) throw new Error('No tiene un sector asignado. Contacte al administrador.')
  const customerService = getCustomerService(supabase)
  return await customerService.searchCustomers(query, sectorId)
}

export async function getLatestReadingAction(customerId: string) {
  const { supabase } = await requireReaderAuth()
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
  const { supabase, userId } = await requireReaderAuth()
  const sectorId = await getAssignedSectorId(userId, supabase)

  const { data: customer } = await supabase
    .from('customers')
    .select('sector_id')
    .eq('id', data.customer_id)
    .single()

  if (!sectorId) throw new Error('No tiene un sector asignado. Contacte al administrador.')
  if (!customer?.sector_id || customer.sector_id !== sectorId) {
    throw new Error('No puede registrar lecturas de suministros fuera de su sector asignado')
  }

  const readingService = getReadingService(supabase)
  return await readingService.registerReading(data, userId)
}
