import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRegisterReading = vi.fn()
const mockGetLatestReading = vi.fn()
const mockGetTodayReadingsCount = vi.fn()
const mockGetActiveCustomersCount = vi.fn()
const mockGetCurrentPeriod = vi.fn()

vi.mock('@/services/reading-service', () => ({
  ReadingService: vi.fn().mockImplementation(() => ({
    registerReading: mockRegisterReading,
    getLatestReading: mockGetLatestReading,
    getTodayReadingsCount: mockGetTodayReadingsCount,
    getActiveCustomersCount: mockGetActiveCustomersCount,
  })),
  getReadingService: vi.fn().mockReturnValue({
    registerReading: mockRegisterReading,
    getLatestReading: mockGetLatestReading,
    getTodayReadingsCount: mockGetTodayReadingsCount,
    getActiveCustomersCount: mockGetActiveCustomersCount,
  })
}))

vi.mock('@/services/period-service', () => ({
  PeriodService: vi.fn().mockImplementation(() => ({
    getCurrentPeriod: mockGetCurrentPeriod,
  })),
  getPeriodService: vi.fn().mockReturnValue({
    getCurrentPeriod: mockGetCurrentPeriod,
  })
}))

const mockSearchCustomers = vi.fn()
vi.mock('@/services/customer-service', () => ({
  CustomerService: vi.fn().mockImplementation(() => ({
    searchCustomers: mockSearchCustomers,
  })),
  getCustomerService: vi.fn().mockReturnValue({
    searchCustomers: mockSearchCustomers,
  })
}))

const mockRequireReaderAuth = vi.fn()
vi.mock('@/lib/auth/server-reader-auth', () => ({
  requireReaderAuth: () => mockRequireReaderAuth()
}))

const mockFrom = vi.fn()
const mockSupabaseInstance = {
  from: mockFrom,
  auth: { getUser: vi.fn(), getClaims: vi.fn() },
  rpc: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseInstance)
}))

const {
  registerReadingAction,
  getLatestReadingAction,
  searchReaderCustomersAction,
  getReaderDashboardDataAction,
  getReaderAssignedSectorAction,
  getReaderAssignedSectorIdAction,
} = await import('@/app/reader/actions')

describe('registerReadingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireReaderAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'reader1' })
  })

  it('debería registrar lectura si el cliente pertenece al sector del lecturador', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: 's1' }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      if (table === 'customers') {
        const promise = Promise.resolve({ data: { sector_id: 's1', is_active: true }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const mockResult = { id: 'rd1', consumption: 50 }
    mockRegisterReading.mockResolvedValue(mockResult)

    const result = await registerReadingAction({
      customer_id: 'c1', billing_period_id: 'p1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    })

    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería rechazar si el lecturador no tiene sector asignado', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: null }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      if (table === 'customers') {
        const promise = Promise.resolve({ data: { sector_id: 's1', is_active: true }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await registerReadingAction({
      customer_id: 'c1', billing_period_id: 'p1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('sector')
    }
  })

  it('debería rechazar si el cliente está fuera del sector asignado', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: 's1' }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      if (table === 'customers') {
        const promise = Promise.resolve({ data: { sector_id: 's2', is_active: true }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await registerReadingAction({
      customer_id: 'c1', billing_period_id: 'p1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('sector')
    }
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireReaderAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await registerReadingAction({
      customer_id: 'c1', billing_period_id: 'p1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    })

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockRequireReaderAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'reader1' })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: 's1' }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      if (table === 'customers') {
        const promise = Promise.resolve({ data: { sector_id: 's1', is_active: true }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
			return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
		})
		mockRegisterReading.mockRejectedValue('fail')

    const result = await registerReadingAction({
      customer_id: 'c1', billing_period_id: 'p1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    })

    expect(result).toEqual({ success: false, error: 'fail' })
  })

  it('debería devolver DUPLICATE_READING si ya existe lectura para ese cliente y periodo', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: 's1' }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      if (table === 'customers') {
        const promise = Promise.resolve({ data: { sector_id: 's1', is_active: true }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })
    mockRegisterReading.mockRejectedValue(new Error('duplicate key value violates unique constraint "readings_customer_period_unique"'))

    const result = await registerReadingAction({
      customer_id: 'c1', billing_period_id: 'p1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    })

    expect(result).toEqual({ success: false, error: 'DUPLICATE_READING' })
  })
})

describe('getLatestReadingAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireReaderAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'reader1' })
  })

  it('debería obtener la última lectura del cliente', async () => {
    const mockReading = { id: 'rd1', consumption: 30 }
    mockGetLatestReading.mockResolvedValue(mockReading)

    const result = await getLatestReadingAction('c1')

    expect(result).toEqual({ success: true, data: mockReading })
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireReaderAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await getLatestReadingAction('c1')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })
})

describe('searchReaderCustomersAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireReaderAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'reader1' })
  })

  it('debería buscar clientes en el sector asignado', async () => {
    const mockCustomers = [{ id: 'c1', full_name: 'Juan' }]
    mockSearchCustomers.mockResolvedValue(mockCustomers)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: 's1' }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await searchReaderCustomersAction('SUM-001')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(mockCustomers)
    }
    expect(mockSearchCustomers).toHaveBeenCalledWith('SUM-001', 's1')
  })

  it('debería retornar error si no tiene sector asignado', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: null }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await searchReaderCustomersAction('SUM-001')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('sector')
    }
  })
})

describe('getReaderDashboardDataAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireReaderAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'reader1' })
  })

  it('debería obtener datos del dashboard', async () => {
    mockGetTodayReadingsCount.mockResolvedValue(10)
    mockGetCurrentPeriod.mockResolvedValue({ name: 'JUNIO 2025', end_date: '2025-06-25' })
    mockGetActiveCustomersCount.mockResolvedValue(45)
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: 's1', sectors: { id: 's1', name: 'Centro', code: 'CTR' } }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await getReaderDashboardDataAction()

    expect(result.success).toBe(true)
    if (result.success && result.data) {
      expect(result.data.syncedCount).toBe(10)
      expect(result.data.activeCustomers).toBe(45)
      expect(result.data.sectorName).toBe('Centro')
    }
  })

  it('debería retornar error si auth falla', async () => {
    mockRequireReaderAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await getReaderDashboardDataAction()

    expect(result).toEqual({ success: false, error: 'No autenticado' })
  })
})

describe('getReaderAssignedSectorAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireReaderAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'reader1' })
  })

  it('debería obtener el sector asignado del lecturador', async () => {
    const mockProfile = { assigned_sector_id: 's1', sectors: { id: 's1', name: 'Centro', code: 'CTR' } }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: mockProfile, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await getReaderAssignedSectorAction()

    expect(result.success).toBe(true)
  })

  it('debería retornar error si la consulta falla', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: null, error: { message: 'Profile not found' } })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await getReaderAssignedSectorAction()

    expect(result.success).toBe(false)
  })
})

describe('getReaderAssignedSectorIdAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireReaderAuth.mockResolvedValue({ supabase: mockSupabaseInstance, userId: 'reader1' })
  })

  it('debería obtener el ID del sector asignado', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const promise = Promise.resolve({ data: { assigned_sector_id: 's1' }, error: null })
        return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(promise) }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })) }
    })

    const result = await getReaderAssignedSectorIdAction()

    expect(result).toEqual({ success: true, data: 's1' })
  })
})
