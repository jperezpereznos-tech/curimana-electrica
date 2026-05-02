'use server'

import { createClient } from '@/lib/supabase/server'
import { getConceptService } from '@/services/concept-service'
import { revalidatePath } from 'next/cache'

export async function registerConceptAction(data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.createConcept(data, user?.id)
  revalidatePath('/admin/concepts')
  return result
}

export async function toggleConceptStatusAction(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.toggleConceptStatus(id, isActive, user?.id)
  revalidatePath('/admin/concepts')
  return result
}

export async function deleteConceptAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.deleteConcept(id, user?.id)
  revalidatePath('/admin/concepts')
  return result
}

export async function updateConceptAction(id: string, data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.updateConcept(id, data, user?.id)
  revalidatePath('/admin/concepts')
  return result
}
