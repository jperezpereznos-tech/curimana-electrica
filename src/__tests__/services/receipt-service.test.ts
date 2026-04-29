import { describe, it, expect } from 'vitest'
import { ReceiptService } from '@/services/receipt-service'

describe('ReceiptService - calculateBreakdown', () => {
  const service = new ReceiptService()
  
  const mockTiers = [
    { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
    { min_kwh: 30, max_kwh: 100, price_per_kwh: 0.62 },
    { min_kwh: 100, max_kwh: null, price_per_kwh: 0.64 }
  ]

  const mockFixedConcepts = [
    { name: 'Cargo Fijo', amount: 3.50, type: 'fixed' },
    { name: 'Alumbrado Público', amount: 4.20, type: 'fixed' },
    { name: 'Mantenimiento', amount: 1.50, type: 'fixed' }
  ]

  it('debería calcular correctamente para 50 kWh con cargos fijos', () => {
    // Energía: 30*0.31 + 20*0.62 = 9.30 + 12.40 = 21.70
    // Fijos: 3.50 + 4.20 + 1.50 = 9.20
    // Total: 21.70 + 9.20 = 30.90
    const result = service.calculateBreakdown(50, mockTiers, mockFixedConcepts)
    
    expect(result.energyAmount).toBe(21.70)
    expect(result.fixedCharges).toBe(9.20)
    expect(result.totalAmount).toBe(30.90)
  })

  it('debería calcular correctamente para 0 kWh (solo cargos fijos)', () => {
    const result = service.calculateBreakdown(0, mockTiers, mockFixedConcepts)
    
    expect(result.energyAmount).toBe(0)
    expect(result.totalAmount).toBe(9.20)
  })

  it('debería incluir la deuda anterior en el total', () => {
    const previousDebt = 15.50
    const result = service.calculateBreakdown(50, mockTiers, mockFixedConcepts, previousDebt)
    
    // 30.90 (actual) + 15.50 (deuda) = 46.40
    expect(result.totalAmount).toBe(46.40)
  })

  it('debería manejar conceptos porcentuales (ej: IGV)', () => {
    const conceptsWithIGV = [
      ...mockFixedConcepts,
      { name: 'IGV', amount: 18, type: 'percentage' }
    ]
    // Energía 50kWh = 21.70
    // IGV = 18% de 21.70 = 3.906 -> 3.91
    // Total Fijos = 9.20 + 3.91 = 13.11
    // Subtotal = 21.70 + 13.11 = 34.81
    const result = service.calculateBreakdown(50, mockTiers, conceptsWithIGV)
    
    const igv = result.conceptsBreakdown.find(c => c.name === 'IGV')
    expect(igv?.amount).toBe(3.91)
    expect(result.subtotal).toBe(34.81)
  })
})
