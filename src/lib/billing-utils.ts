/**
 * Calcula el monto de energía basado en tramos progresivos.
 * @param consumption Consumo en kWh
 * @param tiers Tramos de la tarifa (ordenados por min_kwh)
 * @returns Monto total de energía redondeado a 2 decimales
 */
export function calculateEnergyAmount(
  consumption: number,
  tiers: { min_kwh: number; max_kwh: number | null; price_per_kwh: number }[]
): number {
  let total = 0
  let remaining = consumption

  for (const tier of tiers) {
    if (remaining <= 0) break

    let tierConsumption = 0
    if (tier.max_kwh === null) {
      tierConsumption = remaining
    } else {
      // El consumo en este tramo es el total restante limitado por el ancho del tramo
      const tierWidth = tier.max_kwh - tier.min_kwh
      tierConsumption = Math.min(remaining, tierWidth)
    }

    total += tierConsumption * tier.price_per_kwh
    remaining -= tierConsumption
  }

  return Math.round(total * 100) / 100
}
