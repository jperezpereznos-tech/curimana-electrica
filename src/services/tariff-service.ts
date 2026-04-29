import { tariffRepository } from '@/repositories/tariff-repository'
import { Database } from '@/types/database'

type TierInsert = Omit<Database['public']['Tables']['tariff_tiers']['Insert'], 'id' | 'created_at' | 'tariff_id'>
type TariffInsert = Omit<Database['public']['Tables']['tariffs']['Insert'], 'id' | 'created_at'>

export class TariffService {
  /**
   * Valida que los tramos de consumo no se superpongan y cubran desde 0
   * Ej: 0-30, 31-100, 101-null es válido.
   * Ej: 0-30, 20-50 es inválido.
   */
  validateTiers(tiers: TierInsert[]): void {
    if (!tiers || tiers.length === 0) return

    // Ordenar tramos por min_kwh
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

    // Asignar order_index automáticamente basado en min_kwh
    const tiersWithOrder = [...tiers]
      .sort((a, b) => a.min_kwh - b.min_kwh)
      .map((t, index) => ({ ...t, order_index: index + 1 }))

    return await tariffRepository.createTariffWithTiers(tariff, tiersWithOrder)
  }

  async getAllTariffs() {
    return await tariffRepository.getAllWithTiers()
  }

  async toggleTariffStatus(id: string, isActive: boolean) {
    return await tariffRepository.update(id, { is_active: isActive })
  }
}

export const tariffService = new TariffService()
