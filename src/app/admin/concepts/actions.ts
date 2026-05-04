'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getConceptService } from '@/services/concept-service'
import { revalidatePath } from 'next/cache'

export async function registerConceptAction(data: any) {
  const { supabase, userId } = await requireAdminAuth()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.createConcept(data, userId)
  revalidatePath('/admin/concepts')
  return result
}

export async function toggleConceptStatusAction(id: string, isActive: boolean) {
  const { supabase, userId } = await requireAdminAuth()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.toggleConceptStatus(id, isActive, userId)
  revalidatePath('/admin/concepts')
  return result
}

export async function deleteConceptAction(id: string) {
  const { supabase, userId } = await requireAdminAuth()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.deleteConcept(id, userId)
  revalidatePath('/admin/concepts')
  return result
}

export async function updateConceptAction(id: string, data: any) {
  const { supabase, userId } = await requireAdminAuth()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.updateConcept(id, data, userId)
  revalidatePath('/admin/concepts')
  return result
}
