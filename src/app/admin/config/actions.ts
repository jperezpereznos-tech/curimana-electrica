'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { revalidatePath } from 'next/cache'
import { municipalityConfigSchema } from '@/lib/validations/schemas'

export async function updateMunicipalityConfigAction(data: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = municipalityConfigSchema.parse(data)
    const { supabase } = await requireAdminAuth()

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
        name: parsed.name,
        ruc: parsed.ruc,
        address: parsed.address,
        billing_cut_day: parsed.billing_cut_day,
        payment_grace_days: parsed.payment_grace_days,
        logo_url: parsed.logo_url || null,
      })
      .eq('id', existing.id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/admin/config')
    revalidatePath('/cashier')
    revalidatePath('/admin/receipts')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al actualizar configuracion' }
  }
}
