import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CashClosureService } from '@/services/cash-closure-service'
import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { AuditService } from '@/services/audit-service'

vi.mock('@/repositories/cash-closure-repository')
vi.mock('@/repositories/payment-repository')
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

describe('CashClosureService - getActiveClosure', () => {
  const service = new CashClosureService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería delegar al repositorio', async () => {
    const mockClosure = { id: 'cl1', status: 'open' }
    vi.spyOn(CashClosureRepository.prototype, 'getActiveClosure').mockResolvedValue(mockClosure as any)

    const result = await service.getActiveClosure('user1')

    expect(CashClosureRepository.prototype.getActiveClosure).toHaveBeenCalledWith('user1')
    expect(result).toEqual(mockClosure)
  })

  it('debería retornar null si no hay caja abierta', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getActiveClosure').mockResolvedValue(null)

    const result = await service.getActiveClosure('user1')

    expect(result).toBeNull()
  })
})

describe('CashClosureService - getSessionSummary', () => {
  const service = new CashClosureService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería delegar al repositorio', async () => {
    const mockSummary = { total: 150.50, count: 3 }
    vi.spyOn(CashClosureRepository.prototype, 'getSessionTotal').mockResolvedValue(mockSummary)

    const result = await service.getSessionSummary('user1', '2025-06-01T00:00:00Z', 'cl1')

    expect(CashClosureRepository.prototype.getSessionTotal).toHaveBeenCalledWith('user1', '2025-06-01T00:00:00Z', 'cl1')
    expect(result).toEqual(mockSummary)
  })
})

describe('CashClosureService - openClosure', () => {
  const service = new CashClosureService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería crear un cierre con estado open y monto inicial', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getActiveClosure').mockResolvedValue(null)
    vi.spyOn(CashClosureRepository.prototype, 'create').mockResolvedValue({ id: 'cl1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.openClosure('user1', 200)

    expect(CashClosureRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cashier_id: 'user1',
        opening_amount: 200,
        total_collected: 0,
        total_receipts: 0,
        status: 'open'
      })
    )
  })

  it('debería lanzar error si ya existe una caja abierta', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getActiveClosure').mockResolvedValue({ id: 'cl1', status: 'open' } as any)

    await expect(service.openClosure('user1', 200)).rejects.toThrow('Ya tienes una caja abierta. Ciérrala antes de abrir una nueva.')
  })

  it('debería registrar auditoría', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getActiveClosure').mockResolvedValue(null)
    vi.spyOn(CashClosureRepository.prototype, 'create').mockResolvedValue({ id: 'cl1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.openClosure('user1', 200)

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'cash_closures',
      record_id: 'cl1',
      action: 'INSERT',
      user_id: 'user1'
    }))
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getActiveClosure').mockResolvedValue(null)
    vi.spyOn(CashClosureRepository.prototype, 'create').mockResolvedValue({ id: 'cl1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.openClosure('user1', 200)

    expect(result).toEqual({ id: 'cl1' })
  })
})

describe('CashClosureService - closeClosure', () => {
  const service = new CashClosureService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería calcular totales via getSessionTotal y cerrar el cierre', async () => {
    const mockClosure = { id: 'cl1', cashier_id: 'user1', status: 'open', created_at: '2026-05-01T00:00:00Z' }

    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue(mockClosure as any)
    vi.spyOn(CashClosureRepository.prototype, 'getSessionTotal').mockResolvedValue({ total: 100, count: 2 })
    vi.spyOn(CashClosureRepository.prototype, 'close').mockResolvedValue({ id: 'cl1', status: 'closed' } as any)

    await service.closeClosure('cl1')

    expect(CashClosureRepository.prototype.getSessionTotal).toHaveBeenCalledWith('user1', '2026-05-01T00:00:00Z', 'cl1')
    expect(CashClosureRepository.prototype.close).toHaveBeenCalledWith('cl1', expect.objectContaining({
      total_collected: 100,
      total_receipts: 2
    }))
  })

  it('debería lanzar error si el cierre no existe', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue(null as any)

    await expect(service.closeClosure('missing')).rejects.toThrow('No se encontro el cierre de caja')
  })

  it('debería lanzar error si la caja ya está cerrada', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'closed' } as any)

    await expect(service.closeClosure('cl1')).rejects.toThrow('La caja ya está cerrada')
  })

  it('debería lanzar error si el cierre no tiene cajero', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: null, status: 'open' } as any)

    await expect(service.closeClosure('cl1')).rejects.toThrow('El cierre no tiene cajero asociado')
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open', created_at: '2026-05-01T00:00:00Z' } as any)
    vi.spyOn(CashClosureRepository.prototype, 'getSessionTotal').mockResolvedValue({ total: 100, count: 2 })
    vi.spyOn(CashClosureRepository.prototype, 'close').mockResolvedValue({ id: 'cl1', status: 'closed' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.closeClosure('cl1', 'admin1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'cash_closures',
      record_id: 'cl1',
      action: 'UPDATE',
      user_id: 'admin1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open', created_at: '2026-05-01T00:00:00Z' } as any)
    vi.spyOn(CashClosureRepository.prototype, 'getSessionTotal').mockResolvedValue({ total: 100, count: 2 })
    vi.spyOn(CashClosureRepository.prototype, 'close').mockResolvedValue({ id: 'cl1', status: 'closed' } as any)

    await service.closeClosure('cl1')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open', created_at: '2026-05-01T00:00:00Z' } as any)
    vi.spyOn(CashClosureRepository.prototype, 'getSessionTotal').mockResolvedValue({ total: 100, count: 2 })
    vi.spyOn(CashClosureRepository.prototype, 'close').mockResolvedValue({ id: 'cl1', status: 'closed' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.closeClosure('cl1', 'admin1')

    expect(result).toBeDefined()
  })

  it('debería usar fecha actual si created_at es null', async () => {
    vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: 'user1', status: 'open', created_at: null } as any)
    vi.spyOn(CashClosureRepository.prototype, 'getSessionTotal').mockResolvedValue({ total: 0, count: 0 })
    vi.spyOn(CashClosureRepository.prototype, 'close').mockResolvedValue({ id: 'cl1', status: 'closed' } as any)

    await service.closeClosure('cl1')

    expect(CashClosureRepository.prototype.getSessionTotal).toHaveBeenCalledWith('user1', expect.any(String), 'cl1')
  })
})
