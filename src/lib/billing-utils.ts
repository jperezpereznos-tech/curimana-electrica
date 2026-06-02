export function calculateEnergyAmount(
  consumption: number,
  tiers: { min_kwh: number; max_kwh: number | null; price_per_kwh: number }[]
): number {
  let total = 0

  for (const tier of tiers) {
    if (consumption <= tier.min_kwh) continue

    let tierConsumption = 0
    if (tier.max_kwh === null) {
      tierConsumption = consumption - tier.min_kwh
    } else {
      tierConsumption = Math.min(consumption, tier.max_kwh) - tier.min_kwh
    }

    total += tierConsumption * tier.price_per_kwh
  }

  return Math.round(total * 100) / 100
}

export type BillingConcept = {
  name: string
  amount: number
  type: string
}

export type TariffTier = {
  min_kwh: number
  max_kwh: number | null
  price_per_kwh: number
}

export function calculateBreakdown(
  consumption: number,
  tiers: TariffTier[],
  concepts: BillingConcept[],
  previousDebt: number = 0
) {
  const energyAmount = calculateEnergyAmount(consumption, tiers)

  let totalFixed = 0
  const conceptsBreakdown = concepts.map(c => {
    let amount = 0
    if (c.type === 'fixed') amount = c.amount
    if (c.type === 'percentage') amount = (Math.round((energyAmount + totalFixed) * 100) / 100 * c.amount) / 100
    if (c.type === 'per_kwh') amount = consumption * c.amount

    const roundedAmount = Math.round(amount * 100) / 100
    totalFixed = Math.round((totalFixed + roundedAmount) * 100) / 100
    return { name: c.name, amount: roundedAmount }
  })

  const subtotal = Math.round((energyAmount + totalFixed) * 100) / 100
  const total = Math.round((subtotal + previousDebt) * 100) / 100

  return {
    energyAmount,
    conceptsBreakdown,
    fixedCharges: Math.round(totalFixed * 100) / 100,
    subtotal,
    previousDebt,
    totalAmount: total
  }
}

export function calculateTotalReceipt(
  consumption: number,
  tiers: { min_kwh: number; max_kwh: number | null; price_per_kwh: number }[],
  fixedCharges: number,
  previousDebt: number
): { energy_amount: number; fixed_charges: number; subtotal: number; total_amount: number } {
  const energy_amount = calculateEnergyAmount(consumption, tiers)
  const subtotal = Math.round((energy_amount + fixedCharges) * 100) / 100
  const total_amount = Math.round((subtotal + previousDebt) * 100) / 100

  return { energy_amount, fixed_charges: fixedCharges, subtotal, total_amount }
}
