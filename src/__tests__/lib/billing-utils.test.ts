import { describe, it, expect } from 'vitest'
import { calculateEnergyAmount } from '@/lib/billing-utils'

describe('billing-utils - calculateEnergyAmount', () => {
  const tiers = [
    { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
    { min_kwh: 30, max_kwh: 100, price_per_kwh: 0.62 },
    { min_kwh: 100, max_kwh: null, price_per_kwh: 0.64 }
  ]

  it('debería calcular correctamente para 30 kWh (9.30)', () => {
    expect(calculateEnergyAmount(30, tiers)).toBe(9.30)
  })

  it('debería calcular correctamente para 50 kWh (21.70)', () => {
    // 30 * 0.31 + 20 * 0.62 = 9.30 + 12.40 = 21.70
    expect(calculateEnergyAmount(50, tiers)).toBe(21.70)
  })

  it('debería calcular correctamente para 120 kWh (65.50)', () => {
    // 30 * 0.31 + 70 * 0.62 + 20 * 0.64 = 9.30 + 43.40 + 12.80 = 65.50
    // Nota: El prompt original mencionaba 74.30 pero la suma de los componentes da 65.50.
    expect(calculateEnergyAmount(120, tiers)).toBe(65.50)
  })
})
