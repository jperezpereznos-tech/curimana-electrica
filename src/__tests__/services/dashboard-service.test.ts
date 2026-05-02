import { describe, it, expect, vi } from 'vitest'
import { DashboardService } from '@/services/dashboard-service'

describe('DashboardService - getSummaryKPIs', () => {
  const createMockSupabase = () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    then: vi.fn(),
  })

  it('debería calcular correctamente la recaudación total del mes', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.gte.mockResolvedValueOnce({
      data: [{ amount: 100 }, { amount: 200 }],
      error: null
    })
    mockSupabase.eq.mockResolvedValueOnce({
      data: [{ current_debt: 50 }, { current_debt: 150 }],
      error: null
    })
    mockSupabase.eq.mockResolvedValueOnce({
      count: 2,
      data: null,
      error: null
    })
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: 'period1' },
      error: null
    })
    mockSupabase.in.mockResolvedValueOnce({
      count: 5,
      data: null,
      error: null
    })

    const service = new DashboardService(mockSupabase as any)
    const kpis = await service.getSummaryKPIs()

    expect(kpis.totalCollected).toBe(300)
  })

  it('debería calcular correctamente la deuda total acumulada', async () => {
    const mockSupabase = createMockSupabase()

    mockSupabase.gte.mockResolvedValueOnce({
      data: [],
      error: null
    })
    mockSupabase.eq.mockResolvedValueOnce({
      data: [{ current_debt: 50 }, { current_debt: 150 }],
      error: null
    })
    mockSupabase.eq.mockResolvedValueOnce({
      count: 2,
      data: null,
      error: null
    })
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null
    })

    const service = new DashboardService(mockSupabase as any)
    const kpis = await service.getSummaryKPIs()

    expect(kpis.totalDebt).toBe(200)
  })
})
