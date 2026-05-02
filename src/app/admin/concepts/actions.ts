'use server'

import { createClient } from '@/lib/supabase/server'
import { getConceptService } from '@/services/concept-service'
import { revalidatePath } from 'next/cache'

export async function registerConceptAction(data: any) {
  const supabase = await createClient()
  const conceptService = getConceptService(supabase)
  
  const result = await conceptService.createConcept(data)
  revalidatePath('/admin/concepts')
  return result
}

export async function toggleConceptStatusAction(id: string, isActive: boolean) {
  const supabase = await createClient()
  const conceptService = getConceptService(supabase)
  
  const result = await conceptService.toggleConceptStatus(id, isActive)
  revalidatePath('/admin/concepts')
  return result
}

export async function deleteConceptAction(id: string) {
  const supabase = await createClient()
  const conceptService = getConceptService(supabase)
  
  const result = await conceptService.deleteConcept(id)
  revalidatePath('/admin/concepts')
  return result
}
