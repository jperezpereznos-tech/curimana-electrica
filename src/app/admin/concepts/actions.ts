'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getConceptService } from '@/services/concept-service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { uuidSchema } from '@/lib/validations/schemas'

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
  try {
    const parsed = conceptCreateSchema.parse(data)
    const { supabase, userId } = await requireAdminAuth()
    const conceptService = getConceptService(supabase)
    const result = await conceptService.createConcept(parsed, userId)
    revalidatePath('/admin/concepts')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al crear el concepto' }
  }
}

export async function toggleConceptStatusAction(id: string, isActive: boolean) {
  try {
    uuidSchema.parse(id)
    const { supabase, userId } = await requireAdminAuth()
    const conceptService = getConceptService(supabase)
    const result = await conceptService.toggleConceptStatus(id, isActive, userId)
    revalidatePath('/admin/concepts')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al cambiar estado del concepto' }
  }
}

export async function deleteConceptAction(id: string) {
  try {
    uuidSchema.parse(id)
    const { supabase, userId } = await requireAdminAuth()
    const conceptService = getConceptService(supabase)
    const result = await conceptService.deleteConcept(id, userId)
    revalidatePath('/admin/concepts')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al eliminar el concepto' }
  }
}

export async function updateConceptAction(id: string, data: unknown) {
  try {
    uuidSchema.parse(id)
    const parsed = conceptUpdateSchema.parse(data)
    const { supabase, userId } = await requireAdminAuth()
    const conceptService = getConceptService(supabase)
    const result = await conceptService.updateConcept(id, parsed, userId)
    revalidatePath('/admin/concepts')
    return { success: true as const, data: result }
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : 'Error al actualizar el concepto' }
  }
}
