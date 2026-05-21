import { describe, it, expect } from 'vitest'
import { calculateEnergyAmount, calculateTotalReceipt } from '@/lib/billing-utils'

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

  it('debería manejar tiers trifásicos continuos', () => {
    const triTiers = [
      { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.39 },
      { min_kwh: 30, max_kwh: 100, price_per_kwh: 0.70 },
      { min_kwh: 100, max_kwh: null, price_per_kwh: 0.76 }
    ]
    // 30 * 0.39 + 20 * 0.70 = 11.70 + 14.00 = 25.70
    expect(calculateEnergyAmount(50, triTiers)).toBe(25.70)
    // 30 * 0.39 + 70 * 0.70 + 20 * 0.76 = 11.70 + 49.00 + 15.20 = 75.90
    expect(calculateEnergyAmount(120, triTiers)).toBe(75.90)
  })

  describe('boundary edge cases', () => {
    it('debería calcular correctamente en el límite exacto del primer tramo (30 kWh)', () => {
      expect(calculateEnergyAmount(30, tiers)).toBe(9.30)
    })

    it('debería calcular correctamente en el límite exacto del segundo tramo (100 kWh)', () => {
      // 30 * 0.31 + 70 * 0.62 = 9.30 + 43.40 = 52.70
      expect(calculateEnergyAmount(100, tiers)).toBe(52.70)
    })

    it('debería calcular correctamente para 1 kWh', () => {
      expect(calculateEnergyAmount(1, tiers)).toBe(0.31)
    })

    it('debería calcular correctamente justo debajo del límite del primer tramo (29 kWh)', () => {
      expect(calculateEnergyAmount(29, tiers)).toBe(8.99)
    })

    it('debería calcular correctamente justo encima del límite del primer tramo (31 kWh)', () => {
      // 30 * 0.31 + 1 * 0.62 = 9.30 + 0.62 = 9.92
      expect(calculateEnergyAmount(31, tiers)).toBe(9.92)
    })

    it('debería calcular correctamente para un solo tramo sin límite', () => {
      const singleTier = [
        { min_kwh: 0, max_kwh: null, price_per_kwh: 0.50 }
      ]
      expect(calculateEnergyAmount(100, singleTier)).toBe(50.00)
    })
  })
})

describe('billing-utils - calculateTotalReceipt', () => {
  const tiers = [
    { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
    { min_kwh: 30, max_kwh: 100, price_per_kwh: 0.62 },
    { min_kwh: 100, max_kwh: null, price_per_kwh: 0.64 }
  ]

  it('debería calcular recibo total con cargos fijos', () => {
    const result = calculateTotalReceipt(50, tiers, 5.00, 0)
    expect(result.energy_amount).toBe(21.70)
    expect(result.fixed_charges).toBe(5.00)
    expect(result.subtotal).toBe(26.70)
    expect(result.total_amount).toBe(26.70)
  })

  it('debería incluir deuda anterior en el total', () => {
    const result = calculateTotalReceipt(50, tiers, 5.00, 10.00)
    expect(result.subtotal).toBe(26.70)
    expect(result.total_amount).toBe(36.70)
  })

  it('debería manejar consumo 0 con cargos fijos', () => {
    const result = calculateTotalReceipt(0, tiers, 5.00, 0)
    expect(result.energy_amount).toBe(0)
    expect(result.fixed_charges).toBe(5.00)
    expect(result.total_amount).toBe(5.00)
  })
})
