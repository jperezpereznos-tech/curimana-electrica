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
    expect(calculateEnergyAmount(120, tiers)).toBe(65.50)
  })

  it('debería retornar 0 para consumo 0', () => {
    expect(calculateEnergyAmount(0, tiers)).toBe(0)
  })

  it('debería manejar tiers con gaps entre limites', () => {
    const gappedTiers = [
      { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
      { min_kwh: 31, max_kwh: 100, price_per_kwh: 0.62 },
      { min_kwh: 101, max_kwh: null, price_per_kwh: 0.64 }
    ]
    // 30 * 0.31 + 19 * 0.62 = 9.30 + 11.78 = 21.08
    expect(calculateEnergyAmount(50, gappedTiers)).toBe(21.08)
    // 30 * 0.31 + 69 * 0.62 + 19 * 0.64 = 9.30 + 42.78 + 12.16 = 64.24
    expect(calculateEnergyAmount(120, gappedTiers)).toBe(64.24)
  })
})
