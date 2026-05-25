import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerService } from '@/services/customer-service'
import { CustomerRepository } from '@/repositories/customer-repository'
import { AuditService } from '@/services/audit-service'

vi.mock('@/repositories/customer-repository')
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

describe('CustomerService - searchCustomers', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería delegar la búsqueda al repositorio', async () => {
    const mockCustomers = [{ id: 'c1', full_name: 'Juan' }]
    vi.spyOn(CustomerRepository.prototype, 'searchCustomers').mockResolvedValue(mockCustomers as any)

    const result = await service.searchCustomers('Juan')

    expect(CustomerRepository.prototype.searchCustomers).toHaveBeenCalledWith('Juan', undefined)
    expect(result).toEqual(mockCustomers)
  })

  it('debería pasar sectorId al repositorio', async () => {
    vi.spyOn(CustomerRepository.prototype, 'searchCustomers').mockResolvedValue([] as any)

    await service.searchCustomers('Juan', 's1')

    expect(CustomerRepository.prototype.searchCustomers).toHaveBeenCalledWith('Juan', 's1')
  })

  it('debería recortar espacios de la consulta', async () => {
    vi.spyOn(CustomerRepository.prototype, 'searchCustomers').mockResolvedValue([] as any)

    await service.searchCustomers(' Juan ')

    expect(CustomerRepository.prototype.searchCustomers).toHaveBeenCalledWith('Juan', undefined)
  })
})

describe('CustomerService - getBySupplyNumber', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería delegar al repositorio con supply_number', async () => {
    const mockCustomer = { id: 'c1', supply_number: '608132421', full_name: 'Juan' }
    vi.spyOn(CustomerRepository.prototype, 'getBySupplyNumber').mockResolvedValue(mockCustomer as any)

    const result = await service.getBySupplyNumber('608132421')

    expect(CustomerRepository.prototype.getBySupplyNumber).toHaveBeenCalledWith('608132421')
    expect(result).toEqual(mockCustomer)
  })

  it('debería retornar null si el cliente no existe', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getBySupplyNumber').mockResolvedValue(null)

    const result = await service.getBySupplyNumber('999999999')

    expect(result).toBeNull()
  })

  it('debería recortar espacios del supply_number', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getBySupplyNumber').mockResolvedValue(null)

    await service.getBySupplyNumber(' 608132421 ')

    expect(CustomerRepository.prototype.getBySupplyNumber).toHaveBeenCalledWith('608132421')
  })
})

describe('CustomerService - getCustomerDetails', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería delegar al repositorio', async () => {
    const mockDetails = { customer: { id: 'c1' }, readings: [], receipts: [] }
    vi.spyOn(CustomerRepository.prototype, 'getCustomerDetails').mockResolvedValue(mockDetails as any)

    const result = await service.getCustomerDetails('c1')

    expect(CustomerRepository.prototype.getCustomerDetails).toHaveBeenCalledWith('c1')
    expect(result).toEqual(mockDetails)
  })
})

describe('CustomerService - registerCustomer', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería crear cliente a través del repositorio', async () => {
    const mockCustomer = { id: 'c1', supply_number: '123', full_name: 'Juan' }
    vi.spyOn(CustomerRepository.prototype, 'create').mockResolvedValue(mockCustomer as any)

    const result = await service.registerCustomer({ supply_number: '123', full_name: 'Juan' } as any)

    expect(CustomerRepository.prototype.create).toHaveBeenCalledWith(expect.objectContaining({ supply_number: '123', full_name: 'Juan' }))
    expect(result).toEqual(mockCustomer)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(CustomerRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.registerCustomer({ supply_number: '123', full_name: 'Juan' } as any, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'customers',
      record_id: 'c1',
      action: 'INSERT',
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(CustomerRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)

    await service.registerCustomer({ supply_number: '123', full_name: 'Juan' } as any)

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(CustomerRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.registerCustomer({ supply_number: '123', full_name: 'Juan' } as any, 'user1')

    expect(result).toEqual({ id: 'c1' })
  })

  it('debería propagar error del repositorio', async () => {
    vi.spyOn(CustomerRepository.prototype, 'create').mockRejectedValue(new Error('Duplicate'))

    await expect(service.registerCustomer({ supply_number: '123', full_name: 'Juan' } as any)).rejects.toThrow('Duplicate')
  })
})

describe('CustomerService - updateCustomer', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería actualizar cliente a través del repositorio', async () => {
    const mockUpdated = { id: 'c1', full_name: 'Pedro' }
    vi.spyOn(CustomerRepository.prototype, 'update').mockResolvedValue(mockUpdated as any)

    const result = await service.updateCustomer('c1', { full_name: 'Pedro' } as any)

    expect(CustomerRepository.prototype.update).toHaveBeenCalledWith('c1', { full_name: 'Pedro' })
    expect(result).toEqual(mockUpdated)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(CustomerRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const updateData = { full_name: 'Pedro' }
    await service.updateCustomer('c1', updateData as any, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'customers',
      record_id: 'c1',
      action: 'UPDATE',
      new_data: updateData,
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(CustomerRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)

    await service.updateCustomer('c1', { full_name: 'Pedro' } as any)

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(CustomerRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.updateCustomer('c1', { full_name: 'Pedro' } as any, 'user1')

    expect(result).toEqual({ id: 'c1' })
  })

  it('debería propagar error del repositorio', async () => {
    vi.spyOn(CustomerRepository.prototype, 'update').mockRejectedValue(new Error('Not found'))

    await expect(service.updateCustomer('c1', { full_name: 'Pedro' } as any)).rejects.toThrow('Not found')
  })
})

describe('CustomerService - deleteCustomer', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería eliminar cliente sin recibos', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue({ id: 'c1', supply_number: '123', full_name: 'Juan' } as any)
    const mockSupabase = (service as any).supabase
    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    })
    vi.spyOn(CustomerRepository.prototype, 'delete').mockResolvedValue(true as any)

    const result = await service.deleteCustomer('c1')

    expect(result).toEqual({ success: true })
  })

  it('debería rechazar eliminación si el cliente tiene recibos', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue({ id: 'c1', supply_number: '123', full_name: 'Juan' } as any)
    const mockSupabase = (service as any).supabase
    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: 'r1' }], error: null })
    })

    const result = await service.deleteCustomer('c1')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('recibos')
    }
  })

  it('debería retornar error si el cliente no existe', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue(null as any)

    const result = await service.deleteCustomer('c1')

    expect(result).toEqual({ success: false, error: 'Cliente no encontrado' })
  })

  it('debería registrar auditoría con userId', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue({ id: 'c1', supply_number: '123', full_name: 'Juan' } as any)
    const mockSupabase = (service as any).supabase
    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    })
    vi.spyOn(CustomerRepository.prototype, 'delete').mockResolvedValue(true as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.deleteCustomer('c1', 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'customers',
      action: 'DELETE',
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue({ id: 'c1', supply_number: '123', full_name: 'Juan' } as any)
    const mockSupabase = (service as any).supabase
    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    })
    vi.spyOn(CustomerRepository.prototype, 'delete').mockResolvedValue(true as any)

    await service.deleteCustomer('c1')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue({ id: 'c1', supply_number: '123', full_name: 'Juan' } as any)
    const mockSupabase = (service as any).supabase
    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null })
    })
    vi.spyOn(CustomerRepository.prototype, 'delete').mockResolvedValue(true as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.deleteCustomer('c1', 'user1')

    expect(result).toEqual({ success: true })
  })

  it('debería manejar excepción general', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockRejectedValue(new Error('DB error'))

    const result = await service.deleteCustomer('c1')

    expect(result).toEqual({ success: false, error: 'DB error' })
  })

  it('debería manejar error que no es instancia de Error', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getById').mockRejectedValue('fail')

    const result = await service.deleteCustomer('c1')

    expect(result).toEqual({ success: false, error: 'Error al eliminar cliente' })
  })
})

describe('CustomerService - getTopDebtors', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería delegar al repositorio con límite', async () => {
    const mockDebtors = [{ id: 'c1', current_debt: 500 }]
    vi.spyOn(CustomerRepository.prototype, 'getTopDebtors').mockResolvedValue(mockDebtors as any)

    const result = await service.getTopDebtors(10)

    expect(CustomerRepository.prototype.getTopDebtors).toHaveBeenCalledWith(10)
    expect(result).toEqual(mockDebtors)
  })

  it('debería usar límite por defecto de 5', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getTopDebtors').mockResolvedValue([] as any)

    await service.getTopDebtors()

    expect(CustomerRepository.prototype.getTopDebtors).toHaveBeenCalledWith(5)
  })
})

describe('CustomerService - getCustomersWithDebt', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería llamar getTopDebtors con límite 1000', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getTopDebtors').mockResolvedValue([] as any)

    await service.getCustomersWithDebt()

    expect(CustomerRepository.prototype.getTopDebtors).toHaveBeenCalledWith(1000)
  })
})

describe('CustomerService - getActiveCustomersWithReadings', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería delegar al repositorio', async () => {
    const mockCustomers = [{ id: 'c1' }]
    vi.spyOn(CustomerRepository.prototype, 'getActiveCustomersWithReadings').mockResolvedValue(mockCustomers as any)

    const result = await service.getActiveCustomersWithReadings()

    expect(CustomerRepository.prototype.getActiveCustomersWithReadings).toHaveBeenCalledWith(undefined)
    expect(result).toEqual(mockCustomers)
  })

  it('debería pasar sectorId al repositorio', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getActiveCustomersWithReadings').mockResolvedValue([] as any)

    await service.getActiveCustomersWithReadings('s1')

    expect(CustomerRepository.prototype.getActiveCustomersWithReadings).toHaveBeenCalledWith('s1')
  })
})

describe('CustomerService - getAllForCache', () => {
  const service = new CustomerService(mockSupabase)

  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(AuditService.prototype, 'log').mockResolvedValue() })

  it('debería delegar al repositorio', async () => {
    const mockCache = [{ id: 'c1', supply_number: '123' }]
    vi.spyOn(CustomerRepository.prototype, 'getAllForCache').mockResolvedValue(mockCache as any)

    const result = await service.getAllForCache()

    expect(CustomerRepository.prototype.getAllForCache).toHaveBeenCalledWith(undefined)
    expect(result).toEqual(mockCache)
  })

  it('debería pasar sectorId al repositorio', async () => {
    vi.spyOn(CustomerRepository.prototype, 'getAllForCache').mockResolvedValue([] as any)

    await service.getAllForCache('s1')

    expect(CustomerRepository.prototype.getAllForCache).toHaveBeenCalledWith('s1')
  })
})
