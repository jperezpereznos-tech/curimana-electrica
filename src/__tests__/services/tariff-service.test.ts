import { describe, it, expect, vi } from 'vitest'
import { TariffService } from '@/services/tariff-service'

vi.mock('@/repositories/tariff-repository', () => {
  class MockTariffRepository {
    createTariffWithTiers = vi.fn()
    getAllWithTiers = vi.fn()
    getByIdWithTiers = vi.fn()
    update = vi.fn()
    getAll = vi.fn()
    getById = vi.fn()
    create = vi.fn()
    delete = vi.fn()
  }
  return {
    TariffRepository: MockTariffRepository,
    tariffRepository: new MockTariffRepository(),
  }
})

describe('TariffService - validateTiers', () => {
  const service = new TariffService()

  it('debería fallar si el primer tramo no inicia en 0', () => {
    const tiers = [
      { min_kwh: 10, max_kwh: 30, price_per_kwh: 0.5, order_index: 1 }
    ]
    expect(() => service.validateTiers(tiers)).toThrow('El primer tramo debe iniciar en 0 kWh.')
  })

  it('debería fallar si min_kwh >= max_kwh', () => {
    const tiers = [
      { min_kwh: 0, max_kwh: 0, price_per_kwh: 0.5, order_index: 1 }
    ]
    expect(() => service.validateTiers(tiers)).toThrow('el límite inferior (0) no puede ser mayor o igual al límite superior (0)')
  })

  it('debería fallar si hay tramos superpuestos', () => {
    const tiers = [
      { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.5, order_index: 1 },
      { min_kwh: 25, max_kwh: 100, price_per_kwh: 0.8, order_index: 2 }
    ]
    expect(() => service.validateTiers(tiers)).toThrow('Tramos superpuestos detectados')
  })

  it('debería fallar si un tramo intermedio no tiene max_kwh', () => {
    const tiers = [
      { min_kwh: 0, max_kwh: null, price_per_kwh: 0.5, order_index: 1 },
      { min_kwh: 31, max_kwh: 100, price_per_kwh: 0.8, order_index: 2 }
    ]
    expect(() => service.validateTiers(tiers)).toThrow('Solo el último tramo puede no tener límite superior')
  })

  it('debería pasar con tramos válidos progresivos', () => {
    const tiers = [
      { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31, order_index: 1 },
      { min_kwh: 31, max_kwh: 100, price_per_kwh: 0.62, order_index: 2 },
      { min_kwh: 101, max_kwh: null, price_per_kwh: 0.64, order_index: 3 }
    ]
    expect(() => service.validateTiers(tiers)).not.toThrow()
  })
})
