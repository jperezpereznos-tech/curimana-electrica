import { describe, it, expect, vi } from 'vitest'
import { DashboardService } from '@/services/dashboard-service'

describe('DashboardService - getSummaryKPIs', () => {
  const createMockSupabase = () => {
    const chain: Record<string, any> = {}
    chain.from = vi.fn().mockReturnValue(chain)
    chain.select = vi.fn().mockReturnValue(chain)
    chain.gte = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.in = vi.fn().mockReturnValue(chain)
    chain.order = vi.fn().mockReturnValue(chain)
    chain.limit = vi.fn().mockReturnValue(chain)
    chain.maybeSingle = vi.fn().mockReturnValue(chain)
    chain.head = vi.fn().mockReturnValue(chain)

    const paymentsResult = { data: [{ amount: 100 }, { amount: 200 }], error: null }
    const emptyPaymentsResult = { data: [], error: null }
    const debtResult = { data: [{ current_debt: 50 }, { current_debt: 150 }], error: null }
    const countResult = { count: 2, data: null, error: null }
    const periodResult = { data: { id: 'period1' }, error: null }
    const noPeriodResult = { data: null, error: null }
    const pendingCountResult = { count: 5, data: null, error: null }

    chain.gte.mockImplementation(() => ({
      ...chain,
      then: (resolve: any) => resolve(paymentsResult),
    }))

    let eqCallCount = 0
    chain.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount === 1) return chain
      if (eqCallCount === 2) return {
        ...chain,
        then: (resolve: any) => resolve(debtResult),
      }
      if (eqCallCount === 3) return {
        ...chain,
        then: (resolve: any) => resolve(countResult),
      }
      return chain
    })

    chain.maybeSingle.mockImplementation(() => ({
      then: (resolve: any) => resolve(periodResult),
    }))
    chain.in.mockImplementation(() => ({
      then: (resolve: any) => resolve(pendingCountResult),
    }))

    return chain
  }

  it('debería calcular correctamente la recaudación total del mes', async () => {
    const mockSupabase = createMockSupabase()
    const service = new DashboardService(mockSupabase as any)
    const kpis = await service.getSummaryKPIs()

    expect(kpis.totalCollected).toBe(300)
  })

  it('debería calcular correctamente la deuda total acumulada', async () => {
    const mockSupabase = createMockSupabase()
    const mockSupabase2 = createMockSupabase()

    let eqCallCount = 0
    mockSupabase2.eq.mockImplementation(() => {
      eqCallCount++
      if (eqCallCount === 1) return mockSupabase2
      if (eqCallCount === 2) return {
        ...mockSupabase2,
        then: (resolve: any) => resolve({ data: [{ current_debt: 50 }, { current_debt: 150 }], error: null }),
      }
      if (eqCallCount === 3) return {
        ...mockSupabase2,
        then: (resolve: any) => resolve({ count: 2, data: null, error: null }),
      }
      return mockSupabase2
    })

    mockSupabase2.gte.mockImplementation(() => ({
      ...mockSupabase2,
      then: (resolve: any) => resolve({ data: [], error: null }),
    }))

    mockSupabase2.maybeSingle.mockImplementation(() => ({
      then: (resolve: any) => resolve({ data: null, error: null }),
    }))

    const service = new DashboardService(mockSupabase2 as any)
    const kpis = await service.getSummaryKPIs()

    expect(kpis.totalDebt).toBe(200)
  })
})
