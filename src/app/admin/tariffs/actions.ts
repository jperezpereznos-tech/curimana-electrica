'use server'

import { createClient } from '@/lib/supabase/server'
import { getTariffService } from '@/services/tariff-service'
import { revalidatePath } from 'next/cache'

export async function registerTariffAction(tariff: any, tiers: any[]) {
  const supabase = await createClient()
  const tariffService = getTariffService(supabase)
  
  const result = await tariffService.createTariffWithValidation(tariff, tiers)
  revalidatePath('/admin/tariffs')
  return result
}

export async function toggleTariffStatusAction(id: string, isActive: boolean) {
  const supabase = await createClient()
  const tariffService = getTariffService(supabase)
  
  const result = await tariffService.toggleTariffStatus(id, isActive)
  revalidatePath('/admin/tariffs')
  return result
}

export async function deleteTariffAction(id: string) {
  const supabase = await createClient()
  const tariffService = getTariffService(supabase)
  
  const result = await tariffService.deleteTariff(id)
  revalidatePath('/admin/tariffs')
  return result
}
