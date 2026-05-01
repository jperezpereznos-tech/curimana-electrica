import { TariffRepository } from '@/repositories/tariff-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type TierInsert = Omit<Database['public']['Tables']['tariff_tiers']['Insert'], 'id' | 'created_at' | 'tariff_id'>
type TariffInsert = Omit<Database['public']['Tables']['tariffs']['Insert'], 'id' | 'created_at'>

export class TariffService {
  private tariffRepo: TariffRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.tariffRepo = new TariffRepository(supabaseClient)
  }

  validateTiers(tiers: TierInsert[]): void {
    if (!tiers || tiers.length === 0) return

    const sortedTiers = [...tiers].sort((a, b) => a.min_kwh - b.min_kwh)

    if (sortedTiers[0].min_kwh !== 0) {
      throw new Error('El primer tramo debe iniciar en 0 kWh.')
    }

    for (let i = 0; i < sortedTiers.length; i++) {
      const current = sortedTiers[i]
      const next = sortedTiers[i + 1]

      const currentMax = current.max_kwh ?? null

      if (currentMax !== null && current.min_kwh >= currentMax) {
        throw new Error(`Tramo inválido: el límite inferior (${current.min_kwh}) no puede ser mayor o igual al límite superior (${currentMax}).`)
      }

      if (next) {
        if (currentMax === null) {
          throw new Error('Solo el último tramo puede no tener límite superior (max_kwh null).')
        }
        if (currentMax >= next.min_kwh) {
          throw new Error(`Tramos superpuestos detectados: El tramo que termina en ${currentMax} se cruza con el que inicia en ${next.min_kwh}.`)
        }
      }
    }
  }

  async createTariffWithValidation(tariff: TariffInsert, tiers: TierInsert[]) {
    this.validateTiers(tiers)

    const tiersWithOrder = [...tiers]
      .sort((a, b) => a.min_kwh - b.min_kwh)
      .map((t, index) => ({ ...t, order_index: index + 1 }))

    return await this.tariffRepo.createTariffWithTiers(tariff, tiersWithOrder)
  }

  async getAllTariffs() {
    return await this.tariffRepo.getAllWithTiers()
  }

  async toggleTariffStatus(id: string, isActive: boolean) {
    return await this.tariffRepo.update(id, { is_active: isActive })
  }
}

export const tariffService = new TariffService()

export function getTariffService(supabaseClient: SupabaseClient<Database>) {
  return new TariffService(supabaseClient)
}
