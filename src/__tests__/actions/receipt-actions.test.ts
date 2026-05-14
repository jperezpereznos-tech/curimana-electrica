import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCancelReceipt = vi.fn()
const mockGetActiveConcepts = vi.fn()

vi.mock('@/services/receipt-service', () => ({
  ReceiptService: vi.fn().mockImplementation(() => ({
    cancelReceipt: mockCancelReceipt
  })),
  getReceiptService: vi.fn().mockReturnValue({ cancelReceipt: mockCancelReceipt })
}))

vi.mock('@/services/concept-service', () => ({
  ConceptService: vi.fn().mockImplementation(() => ({
    getActiveConcepts: mockGetActiveConcepts
  })),
  getConceptService: vi.fn().mockReturnValue({ getActiveConcepts: mockGetActiveConcepts })
}))

const mockRequireAdminAuth = vi.fn()
vi.mock('@/lib/auth/server-admin-auth', () => ({
  requireAdminAuth: () => mockRequireAdminAuth()
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

const { cancelReceiptAction, getConceptsForBreakdownAction } = await import('@/app/admin/receipts/actions')

describe('cancelReceiptAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería anular el recibo y revalidar la ruta', async () => {
    const mockResult = { id: '00000000-0000-4000-8200-000000000020', status: 'cancelled' }
    mockCancelReceipt.mockResolvedValue(mockResult)

    const result = await cancelReceiptAction('00000000-0000-4000-8200-000000000020', 'Error en lectura')

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(mockCancelReceipt).toHaveBeenCalledWith('00000000-0000-4000-8200-000000000020', 'Error en lectura', '00000000-0000-4000-8100-000000000001')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/receipts')
    expect(result).toEqual({ success: true, data: mockResult })
  })

  it('debería retornar error si requireAdminAuth falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await cancelReceiptAction('00000000-0000-4000-8200-000000000020', 'razón')

    expect(result).toEqual({ success: false, error: 'No autenticado' })
    expect(mockCancelReceipt).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si cancelReceipt falla', async () => {
    mockCancelReceipt.mockRejectedValue(new Error('El recibo ya está anulado'))

    const result = await cancelReceiptAction('00000000-0000-4000-8200-000000000020', 'razón')

    expect(result).toEqual({ success: false, error: 'El recibo ya está anulado' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockCancelReceipt.mockRejectedValue('string error')

    const result = await cancelReceiptAction('00000000-0000-4000-8200-000000000020', 'razón')

    expect(result).toEqual({ success: false, error: 'Error al anular el recibo' })
  })
})

describe('getConceptsForBreakdownAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdminAuth.mockResolvedValue({ supabase: {}, userId: '00000000-0000-4000-8100-000000000001' })
  })

  it('debería retornar conceptos activos', async () => {
    const mockConcepts = [
      { id: '00000000-0000-4000-8900-000000000090', name: 'Cargo Fijo', amount: 3.50, type: 'fixed', is_active: true },
      { id: '00000000-0000-4000-8900-000000000091', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true }
    ]
    mockGetActiveConcepts.mockResolvedValue(mockConcepts)

    const result = await getConceptsForBreakdownAction()

    expect(mockRequireAdminAuth).toHaveBeenCalled()
    expect(result).toEqual({ success: true, data: mockConcepts })
  })

  it('debería retornar error y data vacía si falla', async () => {
    mockRequireAdminAuth.mockRejectedValue(new Error('No autenticado'))

    const result = await getConceptsForBreakdownAction()

    expect(result).toEqual({ success: false, error: 'No autenticado', data: [] })
  })

  it('debería retornar error genérico si getActiveConcepts falla', async () => {
    mockGetActiveConcepts.mockRejectedValue(new Error('DB connection lost'))

    const result = await getConceptsForBreakdownAction()

    expect(result).toEqual({ success: false, error: 'DB connection lost', data: [] })
  })

  it('debería manejar errores que no son instancias de Error', async () => {
    mockGetActiveConcepts.mockRejectedValue('unknown error')

    const result = await getConceptsForBreakdownAction()

    expect(result).toEqual({ success: false, error: 'Error al obtener conceptos', data: [] })
  })
})
