'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMunicipalityConfigAction(data: {
  name: string
  ruc: string
  address: string
  billing_cut_day: number
  payment_grace_days: number
  logo_url?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('municipality_config')
    .select('id')
    .limit(1)
    .single()

  if (fetchError || !existing) {
    return { success: false, error: 'No existe registro de configuracion municipal' }
  }

  const { error } = await supabase
    .from('municipality_config')
    .update({
      name: data.name,
      ruc: data.ruc,
      address: data.address,
      billing_cut_day: data.billing_cut_day,
      payment_grace_days: data.payment_grace_days,
      logo_url: data.logo_url || null,
    })
    .eq('id', existing.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/config')
  revalidatePath('/cashier')
  revalidatePath('/admin/receipts')
  return { success: true }
}
