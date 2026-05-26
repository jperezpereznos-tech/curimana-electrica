'use server'

import { revalidatePath } from 'next/cache'
import { requireReaderAuth } from '@/lib/auth/server-reader-auth'
import { getReadingService } from '@/services/reading-service'
import { getPeriodService } from '@/services/period-service'
import { getCustomerService } from '@/services/customer-service'
import { readingActionSchema, uuidSchema, querySchema } from '@/lib/validations/schemas'

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

    if (error) return { success: false as const, error: 'Error al obtener sector asignado.' }
    return { success: true as const, data: profile as unknown as SectorProfile }
  } catch {
    return { success: false as const, error: 'Error al obtener sector asignado.' }
  }
}

export async function getReaderAssignedSectorIdAction() {
  try {
    const { supabase, userId } = await requireReaderAuth()
    const data = await getAssignedSectorId(userId, supabase)
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: 'Error al obtener sector asignado.' }
  }
}

export async function getReaderDashboardDataAction() {
  try {
    const { supabase, userId } = await requireReaderAuth()
    const readingService = getReadingService(supabase)
    const periodService = getPeriodService(supabase)

    const [syncedCount, period, sectorResult] = await Promise.all([
      readingService.getTodayReadingsCount(),
      periodService.getCurrentPeriod(),
      supabase
        .from('profiles')
        .select('assigned_sector_id, sectors:assigned_sector_id(id, name, code)')
        .eq('id', userId)
        .single()
    ])

    const sectorProfile = sectorResult.data as SectorProfile | null
    const sectorId = sectorProfile?.assigned_sector_id ?? null

    const activeCustomers = sectorId
      ? await readingService.getActiveCustomersCount(sectorId)
      : 0

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
  } catch {
    return { success: false as const, error: 'Error al cargar dashboard.' }
  }
}

export async function searchReaderCustomersAction(query: string) {
  try {
    const parsed = querySchema.parse(query)
    const { supabase, userId } = await requireReaderAuth()
    const sectorId = await getAssignedSectorId(userId, supabase)
    if (!sectorId) return { success: false as const, error: 'No tiene un sector asignado. Contacte al administrador.' }
    const customerService = getCustomerService(supabase)
    const data = await customerService.searchCustomers(parsed, sectorId)
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: 'Error al buscar clientes.' }
  }
}

export async function getLatestReadingAction(customerId: string) {
  try {
    uuidSchema.parse(customerId)
    const { supabase, userId } = await requireReaderAuth()
    const sectorId = await getAssignedSectorId(userId, supabase)
    if (!sectorId) return { success: false as const, error: 'No tiene un sector asignado. Contacte al administrador.' }

    const { data: customer } = await supabase
      .from('customers')
      .select('sector_id')
      .eq('id', customerId)
      .single()
    if (!customer || customer.sector_id !== sectorId) {
      return { success: false as const, error: 'No puede consultar suministros fuera de su sector asignado.' }
    }

    const readingService = getReadingService(supabase)
    const data = await readingService.getLatestReading(customerId)
    return { success: true as const, data }
  } catch {
    return { success: false as const, error: 'Error al obtener lectura anterior.' }
  }
}

export async function registerReadingAction(data: unknown) {
  try {
    const parsed = readingActionSchema.parse(data)
    const { supabase, userId } = await requireReaderAuth()
    const sectorId = await getAssignedSectorId(userId, supabase)

    const [customerResult, periodResult] = await Promise.all([
      supabase.from('customers').select('sector_id, is_active').eq('id', parsed.customer_id).single(),
      getPeriodService(supabase).getCurrentPeriod(),
    ])

    if (customerResult.error || !customerResult.data) {
      return { success: false as const, error: 'Suministro no encontrado.' }
    }
    const customer = customerResult.data
    if (!sectorId) return { success: false as const, error: 'No tiene un sector asignado. Contacte al administrador.' }
    if (!customer.is_active) {
      return { success: false as const, error: 'No puede registrar lecturas de un suministro inactivo.' }
    }
    if (!customer.sector_id) {
      return { success: false as const, error: 'El suministro no tiene sector asignado. Contacte al administrador para asignar un sector al suministro.' }
    }
    if (customer.sector_id !== sectorId) {
      return { success: false as const, error: 'No puede registrar lecturas de suministros fuera de su sector asignado' }
    }
    if (!periodResult || periodResult.is_closed) {
      return { success: false as const, error: 'No hay un periodo de facturación abierto. Contacte al administrador.' }
    }
    if (parsed.billing_period_id && parsed.billing_period_id !== periodResult.id) {
      return { success: false as const, error: 'El periodo de facturación no corresponde al periodo abierto actual.' }
    }

    const readingService = getReadingService(supabase)
    try {
      const result = await readingService.registerReading(
        { ...parsed, billing_period_id: periodResult.id },
        userId
      )
      revalidatePath('/reader')
      return { success: true as const, data: result }
    } catch (insertError: unknown) {
      if (insertError instanceof Error && insertError.message.includes('readings_customer_period_unique')) {
        return { success: false as const, error: 'DUPLICATE_READING' }
      }
      return { success: false as const, error: 'Error al registrar lectura.' }
    }
  } catch {
    return { success: false as const, error: 'Error al registrar lectura.' }
  }
}
