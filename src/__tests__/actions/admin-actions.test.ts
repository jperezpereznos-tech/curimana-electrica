import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetTopDebtors = vi.fn()
const mockGetCustomersWithDebt = vi.fn()

vi.mock('@/services/customer-service', () => ({
  CustomerService: vi.fn().mockImplementation(() => ({
    getTopDebtors: mockGetTopDebtors,
    getCustomersWithDebt: mockGetCustomersWithDebt,
  })),
  getCustomerService: vi.fn().mockReturnValue({
    getTopDebtors: mockGetTopDebtors,
    getCustomersWithDebt: mockGetCustomersWithDebt,
  })
}))

const mockGetAllReceipts = vi.fn()
vi.mock('@/services/receipt-service', () => ({
  ReceiptService: vi.fn().mockImplementation(() => ({
    getAllReceipts: mockGetAllReceipts,
  })),
  getReceiptService: vi.fn().mockReturnValue({
    getAllReceipts: mockGetAllReceipts,
  })
}))

const mockRequireAdminAuth = vi.fn()
vi.mock('@/lib/auth/server-admin-auth', () => ({
  requireAdminAuth: () => mockRequireAdminAuth()
}))

const {
  getTopDebtorsAction,
  getCustomersWithDebtAction,
  getPaidReceiptsAction,
} = await import('@/app/admin/actions')

describe('getTopDebtorsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería obtener top deudores con límite', async () => {
    const mockDebtors = [{ id: '00000000-0000-4000-8300-000000000030', current_debt: 500 }]
    mockGetTopDebtors.mockResolvedValue(mockDebtors)

    const result = await getTopDebtorsAction(10)

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockGetTopDebtors).toHaveBeenCalledWith(10)
    expect(result).toEqual(mockDebtors)
  })
})

describe('getCustomersWithDebtAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería obtener todos los clientes con deuda', async () => {
    const mockCustomers = [{ id: '00000000-0000-4000-8300-000000000030', current_debt: 100 }]
    mockGetCustomersWithDebt.mockResolvedValue(mockCustomers)

    const result = await getCustomersWithDebtAction()

    expect(mockGetCustomersWithDebt).toHaveBeenCalled()
    expect(result).toEqual(mockCustomers)
  })
})

describe('getPaidReceiptsAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería obtener recibos pagados', async () => {
    const mockReceipts = [{ id: '00000000-0000-4000-8200-000000000020', status: 'paid' }]
    mockGetAllReceipts.mockResolvedValue(mockReceipts)

    const result = await getPaidReceiptsAction()

    expect(mockGetAllReceipts).toHaveBeenCalledWith({ status: 'paid' })
    expect(result).toEqual(mockReceipts)
  })
})
