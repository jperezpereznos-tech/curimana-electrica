'use server'

import { createClient } from '@/lib/supabase/server'
import { getCustomerService } from '@/services/customer-service'
import { revalidatePath } from 'next/cache'

export async function registerCustomerAction(data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const customerService = getCustomerService(supabase)

  const result = await customerService.registerCustomer(data, user?.id)
  revalidatePath('/admin/customers')
  return result
}

export async function updateCustomerAction(id: string, data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const customerService = getCustomerService(supabase)

  const result = await customerService.updateCustomer(id, data, user?.id)
  revalidatePath('/admin/customers')
  return result
}
