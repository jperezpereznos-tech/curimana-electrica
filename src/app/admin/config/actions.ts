'use server'

import { requireAdminAuth } from '@/lib/auth/server-admin-auth'
import { getMunicipalityConfigService } from '@/services/municipality-config-service'
import { revalidatePath } from 'next/cache'
import { municipalityConfigSchema } from '@/lib/validations/schemas'

export async function updateMunicipalityConfigAction(data: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = municipalityConfigSchema.parse(data)
    const { supabase } = await requireAdminAuth()
    const configService = getMunicipalityConfigService(supabase)

    await configService.updateConfig({
      name: parsed.name,
      ruc: parsed.ruc,
      address: parsed.address,
      billing_cut_day: parsed.billing_cut_day,
      payment_grace_days: parsed.payment_grace_days,
      logo_url: parsed.logo_url || null,
    })

    revalidatePath('/admin/config')
    revalidatePath('/cashier')
    revalidatePath('/admin/receipts')
    return { success: true }
  } catch {
    return { success: false, error: 'Error al actualizar configuracion' }
  }
}
