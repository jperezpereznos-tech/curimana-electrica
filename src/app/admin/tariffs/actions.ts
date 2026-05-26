'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getTariffService } from '@/services/tariff-service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { uuidSchema } from '@/lib/validations/schemas'

const tariffSchema = z.object({
  name: z.string().min(1).max(200),
  connection_type: z.enum(['monofásico', 'trifásico']).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
})

const tierSchema = z.object({
  min_kwh: z.number().min(0).finite(),
  max_kwh: z.number().min(0).finite().optional().nullable(),
  price_per_kwh: z.number().min(0).finite(),
  order_index: z.number().int().min(0),
})

export async function registerTariffAction(tariff: unknown, tiers: unknown) {
  try {
    const { supabase, userId } = await requireAdminAuth()
    const tariffService = getTariffService(supabase)
    const parsedTariff = tariffSchema.parse(tariff)
    const parsedTiers = z.array(tierSchema).min(1).parse(tiers)

    const result = await tariffService.createTariffWithValidation(parsedTariff, parsedTiers, userId)
    revalidatePath('/admin/tariffs')
    return { success: true as const, data: result }
  } catch {
    return { success: false as const, error: 'Error al crear la tarifa' }
  }
}

export async function toggleTariffStatusAction(id: string, isActive: boolean) {
  try {
    uuidSchema.parse(id)
    const { supabase, userId } = await requireAdminAuth()
    const tariffService = getTariffService(supabase)

    const result = await tariffService.toggleTariffStatus(id, isActive, userId)
    revalidatePath('/admin/tariffs')
    return { success: true as const, data: result }
  } catch {
    return { success: false as const, error: 'Error al cambiar estado de la tarifa' }
  }
}

export async function deleteTariffAction(id: string) {
  try {
    uuidSchema.parse(id)
    const { supabase, userId } = await requireAdminAuth()
    const tariffService = getTariffService(supabase)

    const result = await tariffService.deleteTariff(id, userId)
    revalidatePath('/admin/tariffs')
    return { success: true as const, data: result }
  } catch {
    return { success: false as const, error: 'Error al eliminar la tarifa' }
  }
}

export async function updateTariffAction(id: string, tariff: unknown, tiers: unknown) {
  try {
    uuidSchema.parse(id)
    const { supabase, userId } = await requireAdminAuth()
    const tariffService = getTariffService(supabase)
    const parsedTariff = tariffSchema.partial().parse(tariff)
    const parsedTiers = z.array(tierSchema).min(1).parse(tiers)

    const result = await tariffService.updateTariffWithTiers(id, parsedTariff, parsedTiers, userId)
    revalidatePath('/admin/tariffs')
    return { success: true as const, data: result }
  } catch {
    return { success: false as const, error: 'Error al actualizar la tarifa' }
  }
}
