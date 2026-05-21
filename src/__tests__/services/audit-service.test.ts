import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditService } from '@/services/audit-service'
import { AuditRepository } from '@/repositories/audit-repository'

vi.mock('@/repositories/audit-repository')

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
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'test-user' } }, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
    }),
  },
} as any

describe('AuditService - log', () => {
  const service = new AuditService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería registrar un log con ip_address por defecto server-side', async () => {
    vi.spyOn(AuditRepository.prototype, 'create').mockResolvedValue({ id: 'a1' } as any)

    await service.log({
      table_name: 'receipts',
      record_id: 'r1',
      action: 'UPDATE',
      old_data: { status: 'pending' },
      new_data: { status: 'cancelled' },
      user_id: 'user1'
    })

    expect(AuditRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({
        table_name: 'receipts',
        record_id: 'r1',
        action: 'UPDATE',
        old_data: { status: 'pending' },
        new_data: { status: 'cancelled' },
        user_id: 'user1',
        ip_address: 'server-side'
      })
    )
  })

  it('debería usar ip_address personalizada si se proporciona', async () => {
    vi.spyOn(AuditRepository.prototype, 'create').mockResolvedValue({ id: 'a1' } as any)

    await service.log({
      table_name: 'receipts',
      record_id: 'r1',
      action: 'INSERT',
      ip_address: '192.168.1.1'
    })

    expect(AuditRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ ip_address: '192.168.1.1' })
    )
  })

  it('debería usar user_role si se proporciona', async () => {
    vi.spyOn(AuditRepository.prototype, 'create').mockResolvedValue({ id: 'a1' } as any)

    await service.log({
      table_name: 'billing_periods',
      record_id: 'p1',
      action: 'UPDATE',
      user_id: 'admin1',
      user_role: 'admin'
    })

    expect(AuditRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'admin1', user_role: 'admin' })
    )
  })

  it('debería usar null para campos opcionales omitidos', async () => {
    vi.spyOn(AuditRepository.prototype, 'create').mockResolvedValue({ id: 'a1' } as any)

    await service.log({
      table_name: 'test',
      record_id: '1',
      action: 'DELETE'
    })

    expect(AuditRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({
        old_data: null,
        new_data: null,
        user_id: null,
        user_role: null,
        ip_address: 'server-side'
      })
    )
  })

  it('debería registrar acción INSERT correctamente', async () => {
    vi.spyOn(AuditRepository.prototype, 'create').mockResolvedValue({ id: 'a1' } as any)

    await service.log({
      table_name: 'billing_concepts',
      record_id: 'c1',
      action: 'INSERT',
      new_data: { code: 'ALUM', name: 'Alumbrado' }
    })

    expect(AuditRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INSERT', new_data: { code: 'ALUM', name: 'Alumbrado' } })
    )
  })

  it('debería registrar acción DELETE con old_data', async () => {
    vi.spyOn(AuditRepository.prototype, 'create').mockResolvedValue({ id: 'a1' } as any)

    await service.log({
      table_name: 'billing_concepts',
      record_id: 'c1',
      action: 'DELETE',
      old_data: { id: 'c1', code: 'ALUM' }
    })

    expect(AuditRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DELETE', old_data: { id: 'c1', code: 'ALUM' } })
    )
  })

  it('debería lanzar error si el repositorio falla', async () => {
    vi.spyOn(AuditRepository.prototype, 'create').mockRejectedValue(new Error('DB error'))

    await expect(service.log({
      table_name: 'test',
      record_id: '1',
      action: 'INSERT'
    })).rejects.toThrow('DB error')
  })
})

describe('AuditService - getAuditLogs', () => {
  const service = new AuditService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería delegar al repositorio', async () => {
    const mockLogs = [{ id: 'a1', action: 'INSERT' }, { id: 'a2', action: 'UPDATE' }]
    vi.spyOn(AuditRepository.prototype, 'getAllLogs').mockResolvedValue(mockLogs as any)

    const result = await service.getAuditLogs()

    expect(AuditRepository.prototype.getAllLogs).toHaveBeenCalled()
    expect(result).toEqual(mockLogs)
  })

  it('debería propagar error si el repositorio falla', async () => {
    vi.spyOn(AuditRepository.prototype, 'getAllLogs').mockRejectedValue(new Error('Connection lost'))

    await expect(service.getAuditLogs()).rejects.toThrow('Connection lost')
  })
})
