'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getTariffService } from '@/services/tariff-service'
import { revalidatePath } from 'next/cache'

export async function registerTariffAction(tariff: any, tiers: any[]) {
  const { supabase, userId } = await requireAdminAuth()
  const tariffService = getTariffService(supabase)

  const result = await tariffService.createTariffWithValidation(tariff, tiers, userId)
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

export async function updateTariffAction(id: string, tariff: any, tiers: any[]) {
  const { supabase, userId } = await requireAdminAuth()
  const tariffService = getTariffService(supabase)

  const result = await tariffService.updateTariffWithTiers(id, tariff, tiers, userId)
  revalidatePath('/admin/tariffs')
  return result
}
