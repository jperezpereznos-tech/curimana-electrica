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
  sector: z.string().optional().nullable(),
  sector_id: z.string().optional().nullable(),
  tariff_id: z.string().optional().nullable(),
  connection_type: z.enum(['monofasico', 'trifasico']).optional().nullable(),
  is_active: z.boolean().optional().nullable(),
  current_debt: z.number().optional().nullable(),
})

export async function registerCustomerAction(data: unknown) {
  const { supabase, userId } = await requireAdminAuth()
  const customerService = getCustomerService(supabase)
  const parsed = customerSchema.parse(data)

  const result = await customerService.registerCustomer(parsed, userId)
  revalidatePath('/admin/customers')
  return result
}

export async function updateCustomerAction(id: string, data: unknown) {
  const { supabase, userId } = await requireAdminAuth()
  const customerService = getCustomerService(supabase)
  const parsed = customerSchema.partial().parse(data)

  const result = await customerService.updateCustomer(id, parsed, userId)
  revalidatePath('/admin/customers')
  return result
}
