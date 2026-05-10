'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getCustomerService } from '@/services/customer-service'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const customerSchema = z.object({
  full_name: z.string().min(1),
  supply_number: z.string().min(1),
  address: z.string().min(1),
  document_number: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  sector_id: z.string().optional().nullable(),
  tariff_id: z.string().optional().nullable(),
  connection_type: z.enum(['monofásico', 'trifásico']).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  current_debt: z.number().optional().nullable(),
})

export async function registerCustomerAction(data: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId } = await requireAdminAuth()
    const customerService = getCustomerService(supabase)
    const parsed = customerSchema.parse(data)

  await customerService.registerCustomer(parsed, userId)
  revalidatePath('/admin/customers')
  return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al registrar cliente' }
  }
}

export async function updateCustomerAction(id: string, data: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId } = await requireAdminAuth()
    const customerService = getCustomerService(supabase)
    const parsed = customerSchema.partial().parse(data)

  await customerService.updateCustomer(id, parsed, userId)
  revalidatePath('/admin/customers')
  return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al actualizar cliente' }
  }
}

export async function deleteCustomerAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, userId } = await requireAdminAuth()
    const customerService = getCustomerService(supabase)

    const result = await customerService.deleteCustomer(id, userId)
    if (!result.success) return result
    revalidatePath('/admin/customers')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al eliminar cliente' }
  }
}
