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
      const tierWidth = tier.max_kwh - tier.min_kwh
      tierConsumption = Math.min(remaining, tierWidth)
    }

    total += tierConsumption * tier.price_per_kwh
    remaining -= tierConsumption
  }

  return Math.round(total * 100) / 100
}

export function calculateTotalReceipt(
  consumption: number,
  tiers: { min_kwh: number; max_kwh: number | null; price_per_kwh: number }[],
  fixedCharges: number,
  previousDebt: number
): { energy_amount: number; fixed_charges: number; subtotal: number; igv: number; total_amount: number } {
  const energy_amount = calculateEnergyAmount(consumption, tiers)
  const subtotal = Math.round((energy_amount + fixedCharges) * 100) / 100
  const igv = Math.round(subtotal * 0.18 * 100) / 100
  const total_amount = Math.round((subtotal + igv + previousDebt) * 100) / 100

  return { energy_amount, fixed_charges: fixedCharges, subtotal, igv, total_amount }
}
