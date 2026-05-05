'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getTariffService } from '@/services/tariff-service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const tariffSchema = z.object({
  name: z.string().min(1),
  connection_type: z.enum(['monofasico', 'trifasico']).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
})

const tierSchema = z.object({
  min_kwh: z.number(),
  max_kwh: z.number().optional().nullable(),
  price_per_kwh: z.number(),
  order_index: z.number(),
})

export async function registerTariffAction(tariff: unknown, tiers: unknown) {
  const { supabase, userId } = await requireAdminAuth()
  const tariffService = getTariffService(supabase)
  const parsedTariff = tariffSchema.parse(tariff)
  const parsedTiers = z.array(tierSchema).parse(tiers)

  const result = await tariffService.createTariffWithValidation(parsedTariff, parsedTiers, userId)
  revalidatePath('/admin/tariffs')
  return result
}

export async function toggleTariffStatusAction(id: string, isActive: boolean) {
  const { supabase, userId } = await requireAdminAuth()
  const tariffService = getTariffService(supabase)

  const result = await tariffService.toggleTariffStatus(id, isActive, userId)
  revalidatePath('/admin/tariffs')
  return result
}

export async function deleteTariffAction(id: string) {
  const { supabase, userId } = await requireAdminAuth()
  const tariffService = getTariffService(supabase)

  const result = await tariffService.deleteTariff(id, userId)
  revalidatePath('/admin/tariffs')
  return result
}

export async function updateTariffAction(id: string, tariff: unknown, tiers: unknown) {
  const { supabase, userId } = await requireAdminAuth()
  const tariffService = getTariffService(supabase)
  const parsedTariff = tariffSchema.partial().parse(tariff)
  const parsedTiers = z.array(tierSchema).parse(tiers)

  const result = await tariffService.updateTariffWithTiers(id, parsedTariff, parsedTiers, userId)
  revalidatePath('/admin/tariffs')
  return result
}
