'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getCustomerService } from '@/services/customer-service'
import { revalidatePath } from 'next/cache'

export async function registerCustomerAction(data: any) {
  const { supabase, userId } = await requireAdminAuth()
  const customerService = getCustomerService(supabase)

  const result = await customerService.registerCustomer(data, userId)
  revalidatePath('/admin/customers')
  return result
}

export async function updateCustomerAction(id: string, data: any) {
  const { supabase, userId } = await requireAdminAuth()
  const customerService = getCustomerService(supabase)

  const result = await customerService.updateCustomer(id, data, userId)
  revalidatePath('/admin/customers')
  return result
}
