'use server'

import { requireReaderAuth } from '@/lib/auth/server-reader-auth'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'
import { getCustomerService } from '@/services/customer-service'

type AuthedSupabase = Awaited<ReturnType<typeof requireReaderAuth>>['supabase']

type SectorProfile = {
  assigned_sector_id: string | null
  sectors: { id: string; name: string; code: string } | null
}

async function getAssignedSectorId(userId: string, supabase: AuthedSupabase) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('assigned_sector_id')
    .eq('id', userId)
    .single()
  return profile?.assigned_sector_id ?? null
}

export async function getReaderAssignedSectorAction() {
  try {
    const { supabase, userId } = await requireReaderAuth()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('assigned_sector_id, sectors:id!profiles_assigned_sector_id_fkey(id, name, code)')
      .eq('id', userId)
      .single()

    if (error) return { success: false as const, error: error.message }
    return { success: true as const, data: profile as unknown as SectorProfile }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener sector asignado.' }
  }
}

export async function getReaderAssignedSectorIdAction() {
  try {
    const { supabase, userId } = await requireReaderAuth()
    const data = await getAssignedSectorId(userId, supabase)
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener sector asignado.' }
  }
}

export async function getReaderDashboardDataAction() {
  try {
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
      activeCustomers = await readingService.getActiveCustomersCount(sectorId)
    }

    const sectorProfile = sectorResult.data as SectorProfile | null

    return {
      success: true as const,
      data: {
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
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al cargar dashboard.' }
  }
}

export async function searchReaderCustomersAction(query: string) {
  try {
    const { supabase, userId } = await requireReaderAuth()
    const sectorId = await getAssignedSectorId(userId, supabase)
    if (!sectorId) return { success: false as const, error: 'No tiene un sector asignado. Contacte al administrador.' }
    const customerService = getCustomerService(supabase)
    const data = await customerService.searchCustomers(query, sectorId)
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al buscar clientes.' }
  }
}

export async function getLatestReadingAction(customerId: string) {
  try {
    const { supabase } = await requireReaderAuth()
    const readingService = getReadingService(supabase)
    const data = await readingService.getLatestReading(customerId)
    return { success: true as const, data }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al obtener lectura anterior.' }
  }
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
  try {
    const { supabase, userId } = await requireReaderAuth()
    const sectorId = await getAssignedSectorId(userId, supabase)

    const { data: customer } = await supabase
      .from('customers')
      .select('sector_id')
      .eq('id', data.customer_id)
      .single()

    if (!sectorId) return { success: false as const, error: 'No tiene un sector asignado. Contacte al administrador.' }
    if (!customer?.sector_id || customer.sector_id !== sectorId) {
      return { success: false as const, error: 'No puede registrar lecturas de suministros fuera de su sector asignado' }
    }

    const readingService = getReadingService(supabase)
    const result = await readingService.registerReading(data, userId)
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al registrar lectura.' }
  }
}
