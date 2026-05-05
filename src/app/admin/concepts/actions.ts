'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getConceptService } from '@/services/concept-service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const conceptCreateSchema = z.object({
  code: z.string().min(2),
  name: z.string().min(3),
  description: z.string().optional(),
  amount: z.number().min(0),
  type: z.enum(['fixed', 'percentage', 'per_kwh']),
  applies_to_tariff_id: z.string().nullable().optional(),
  is_active: z.boolean(),
})

const conceptUpdateSchema = z.object({
  code: z.string().min(2).optional(),
  name: z.string().min(3).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  type: z.enum(['fixed', 'percentage', 'per_kwh']).optional(),
  applies_to_tariff_id: z.string().nullable().optional(),
})

export async function registerConceptAction(data: unknown) {
  const parsed = conceptCreateSchema.parse(data)
  const { supabase, userId } = await requireAdminAuth()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.createConcept(parsed, userId)
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

export async function updateConceptAction(id: string, data: unknown) {
  const parsed = conceptUpdateSchema.parse(data)
  const { supabase, userId } = await requireAdminAuth()
  const conceptService = getConceptService(supabase)

  const result = await conceptService.updateConcept(id, parsed, userId)
  revalidatePath('/admin/concepts')
  return result
}
