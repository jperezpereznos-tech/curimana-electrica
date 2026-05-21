import { MunicipalityConfigRepository } from '@/repositories/municipality-config-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

export class MunicipalityConfigService {
  private configRepo: MunicipalityConfigRepository

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.configRepo = new MunicipalityConfigRepository(supabaseClient)
  }

  async getConfig() {
    return await this.configRepo.getConfig()
  }

  async getBillingCutDay() {
    return await this.configRepo.getBillingCutDay()
  }

  async getPaymentGraceDays() {
    return await this.configRepo.getPaymentGraceDays()
  }

  async getBasicInfo() {
    return await this.configRepo.getBasicInfo()
  }

  async updateConfig(data: {
    name: string
    ruc: string
    address: string
    billing_cut_day: number
    payment_grace_days: number
    logo_url: string | null
  }) {
    const existing = await this.configRepo.getConfig()
    return await this.configRepo.updateConfig(existing.id, data)
  }
}

export function getMunicipalityConfigService(supabaseClient: SupabaseClient<Database>) {
  return new MunicipalityConfigService(supabaseClient)
}
