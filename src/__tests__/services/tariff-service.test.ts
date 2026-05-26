import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TariffService } from '@/services/tariff-service'
import { TariffRepository } from '@/repositories/tariff-repository'
import { AuditService } from '@/services/audit-service'

vi.mock('@/repositories/tariff-repository')
vi.mock('@/services/audit-service')

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
  }),
  rpc: vi.fn().mockReturnValue({ data: null, error: null }),
		auth: {
			getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
		},
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
    }),
  },
} as any

describe('TariffService - validateTiers', () => {
  const service = new TariffService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería pasar si los tramos son válidos', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 30, price_per_kwh: 0.5 },
      { order_index: 2, min_kwh: 30, max_kwh: 100, price_per_kwh: 0.8 },
      { order_index: 3, min_kwh: 100, max_kwh: null, price_per_kwh: 1.2 },
    ]

    expect(() => service.validateTiers(tiers)).not.toThrow()
  })

  it('debería lanzar error si el primer tramo no inicia en 0', () => {
    const tiers = [{ order_index: 1, min_kwh: 10, max_kwh: 30, price_per_kwh: 0.5 }]

    expect(() => service.validateTiers(tiers)).toThrow('El primer tramo debe iniciar en 0 kWh')
  })

  it('debería lanzar error si min_kwh >= max_kwh en un tramo', () => {
    const tiers = [{ order_index: 1, min_kwh: 0, max_kwh: 0, price_per_kwh: 0.5 }]

    expect(() => service.validateTiers(tiers)).toThrow('Tramo inválido')
  })

  it('debería lanzar error si tramo intermedio no tiene max_kwh', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: null, price_per_kwh: 0.5 },
      { order_index: 2, min_kwh: 31, max_kwh: 100, price_per_kwh: 0.8 },
    ]

    expect(() => service.validateTiers(tiers)).toThrow('Solo el último tramo puede no tener límite superior')
  })

  it('debería lanzar error si tramos se superponen', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 50, price_per_kwh: 0.5 },
      { order_index: 2, min_kwh: 40, max_kwh: 100, price_per_kwh: 0.8 },
    ]

    expect(() => service.validateTiers(tiers)).toThrow('Tramos superpuestos')
  })

  it('no debería validar si tiers está vacío', () => {
    expect(() => service.validateTiers([])).not.toThrow()
  })

  it('no debería validar si tiers es undefined', () => {
    expect(() => service.validateTiers(undefined as any)).not.toThrow()
  })

  it('debería aceptar último tramo sin max_kwh', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 30, price_per_kwh: 0.5 },
      { order_index: 2, min_kwh: 30, max_kwh: null, price_per_kwh: 1.2 },
    ]

    expect(() => service.validateTiers(tiers)).not.toThrow()
  })

  it('debería aceptar tramos contiguos donde max_kwh del anterior iguala min_kwh del siguiente', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
      { order_index: 2, min_kwh: 30, max_kwh: 100, price_per_kwh: 0.62 },
      { order_index: 3, min_kwh: 100, max_kwh: null, price_per_kwh: 0.64 },
    ]

    expect(() => service.validateTiers(tiers)).not.toThrow()
  })

  it('debería rechazar tramos con gap entre ellos por defecto (strictContinuity=true)', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
      { order_index: 2, min_kwh: 32, max_kwh: 100, price_per_kwh: 0.62 },
    ]

    expect(() => service.validateTiers(tiers)).toThrow('Tramos discontinuos')
  })

  it('debería aceptar tramos con gap si strictContinuity=false', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
      { order_index: 2, min_kwh: 32, max_kwh: 100, price_per_kwh: 0.62 },
    ]

    expect(() => service.validateTiers(tiers, false)).not.toThrow()
  })

  it('debería rechazar tramos superpuestos incluso con validación estricta', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 50, price_per_kwh: 0.5 },
      { order_index: 2, min_kwh: 40, max_kwh: 100, price_per_kwh: 0.8 },
    ]

    expect(() => service.validateTiers(tiers)).toThrow('Tramos superpuestos')
  })

  it('debería aceptar tramos trifásicos contiguos', () => {
    const tiers = [
      { order_index: 1, min_kwh: 0, max_kwh: 30, price_per_kwh: 0.39 },
      { order_index: 2, min_kwh: 30, max_kwh: 100, price_per_kwh: 0.70 },
      { order_index: 3, min_kwh: 100, max_kwh: null, price_per_kwh: 0.76 },
    ]

    expect(() => service.validateTiers(tiers)).not.toThrow()
  })
})

describe('TariffService - createTariffWithValidation', () => {
  const service = new TariffService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería crear tarifa con tramos ordenados', async () => {
    const mockResult = { id: 't1', name: 'BTSB' }
    vi.spyOn(TariffRepository.prototype, 'createTariffWithTiers').mockResolvedValue(mockResult as any)

    const tiers = [
      { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.5 },
      { min_kwh: 30, max_kwh: null, price_per_kwh: 1.2 },
    ]
    const result = await service.createTariffWithValidation({ name: 'BTSB' } as any, tiers as any)

    expect(TariffRepository.prototype.createTariffWithTiers).toHaveBeenCalledWith(
      { name: 'BTSB' },
      expect.arrayContaining([
        expect.objectContaining({ order_index: 1, min_kwh: 0 }),
        expect.objectContaining({ order_index: 2, min_kwh: 30 }),
      ])
    )
    expect(result).toEqual(mockResult)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'createTariffWithTiers').mockResolvedValue({ id: 't1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.createTariffWithValidation({ name: 'BTSB' } as any, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1 }] as any, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'tariffs',
      action: 'INSERT',
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'createTariffWithTiers').mockResolvedValue({ id: 't1' } as any)

    await service.createTariffWithValidation({ name: 'BTSB' } as any, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1 }] as any)

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(TariffRepository.prototype, 'createTariffWithTiers').mockResolvedValue({ id: 't1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.createTariffWithValidation({ name: 'BTSB' } as any, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1 }] as any, 'user1')

    expect(result).toEqual({ id: 't1' })
  })

  it('debería lanzar error si validateTiers falla', async () => {
    const badTiers = [{ order_index: 1, min_kwh: 10, max_kwh: 30, price_per_kwh: 0.5 }]

    await expect(service.createTariffWithValidation({ name: 'BTSB' } as any, badTiers as any))
      .rejects.toThrow('El primer tramo debe iniciar en 0 kWh')
  })
})

describe('TariffService - getAllTariffs', () => {
  const service = new TariffService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería delegar al repositorio', async () => {
    const mockTariffs = [{ id: 't1', name: 'BTSB' }]
    vi.spyOn(TariffRepository.prototype, 'getAllWithTiers').mockResolvedValue(mockTariffs as any)

    const result = await service.getAllTariffs()

    expect(TariffRepository.prototype.getAllWithTiers).toHaveBeenCalled()
    expect(result).toEqual(mockTariffs)
  })
})

describe('TariffService - toggleTariffStatus', () => {
  const service = new TariffService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería actualizar is_active a través del repositorio', async () => {
    vi.spyOn(TariffRepository.prototype, 'update').mockResolvedValue({ id: 't1', is_active: false } as any)

    const result = await service.toggleTariffStatus('t1', false)

    expect(TariffRepository.prototype.update).toHaveBeenCalledWith('t1', { is_active: false })
    expect(result).toEqual({ id: 't1', is_active: false })
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'update').mockResolvedValue({ id: 't1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.toggleTariffStatus('t1', true, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'tariffs',
      action: 'UPDATE',
      new_data: { is_active: true },
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'update').mockResolvedValue({ id: 't1' } as any)

    await service.toggleTariffStatus('t1', true)

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(TariffRepository.prototype, 'update').mockResolvedValue({ id: 't1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.toggleTariffStatus('t1', true, 'user1')

    expect(result).toEqual({ id: 't1' })
  })
})

describe('TariffService - deleteTariff', () => {
  const service = new TariffService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería eliminar tarifa a través del repositorio', async () => {
    vi.spyOn(TariffRepository.prototype, 'delete').mockResolvedValue(true as any)

    const result = await service.deleteTariff('t1')

    expect(TariffRepository.prototype.delete).toHaveBeenCalledWith('t1')
    expect(result).toBe(true)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'delete').mockResolvedValue(true as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.deleteTariff('t1', 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'tariffs',
      action: 'DELETE',
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'delete').mockResolvedValue(true as any)

    await service.deleteTariff('t1')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(TariffRepository.prototype, 'delete').mockResolvedValue(true as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.deleteTariff('t1', 'user1')

    expect(result).toBe(true)
  })
})

describe('TariffService - updateTariffWithTiers', () => {
  const service = new TariffService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería actualizar tarifa con tramos validados y ordenados', async () => {
    const mockResult = { id: 't1', name: 'BTSB Updated' }
    vi.spyOn(TariffRepository.prototype, 'updateTariffWithTiers').mockResolvedValue(mockResult as any)

    const tiers = [
      { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.6 },
      { min_kwh: 30, max_kwh: null, price_per_kwh: 1.3 },
    ]
    const result = await service.updateTariffWithTiers('t1', { name: 'BTSB Updated' } as any, tiers as any)

    expect(TariffRepository.prototype.updateTariffWithTiers).toHaveBeenCalledWith('t1', { name: 'BTSB Updated' }, expect.arrayContaining([
      expect.objectContaining({ order_index: 1 }),
      expect.objectContaining({ order_index: 2 }),
    ]))
    expect(result).toEqual(mockResult)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'updateTariffWithTiers').mockResolvedValue({ id: 't1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.updateTariffWithTiers('t1', { name: 'BTSB' } as any, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1 }] as any, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'tariffs',
      action: 'UPDATE',
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(TariffRepository.prototype, 'updateTariffWithTiers').mockResolvedValue({ id: 't1' } as any)

    await service.updateTariffWithTiers('t1', { name: 'BTSB' } as any, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1 }] as any)

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(TariffRepository.prototype, 'updateTariffWithTiers').mockResolvedValue({ id: 't1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.updateTariffWithTiers('t1', { name: 'BTSB' } as any, [{ min_kwh: 0, max_kwh: null, price_per_kwh: 1 }] as any, 'user1')

    expect(result).toEqual({ id: 't1' })
  })

  it('debería lanzar error si validateTiers falla', async () => {
    const badTiers = [{ order_index: 1, min_kwh: 10, max_kwh: 30, price_per_kwh: 0.5 }]

    await expect(service.updateTariffWithTiers('t1', {} as any, badTiers as any))
      .rejects.toThrow('El primer tramo debe iniciar en 0 kWh')
  })
})
