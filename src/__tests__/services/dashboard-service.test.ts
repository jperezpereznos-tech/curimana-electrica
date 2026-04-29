import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardService } from '@/services/dashboard-service'

describe('DashboardService - getSummaryKPIs', () => {
  // Mock del cliente de Supabase
  const createMockSupabase = () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    then: vi.fn(),
  })

  it('debería calcular correctamente la recaudación total del mes', async () => {
    const mockSupabase = createMockSupabase()
    
    // Configurar respuesta para payments
    mockSupabase.gte.mockResolvedValueOnce({ 
      data: [{ amount: 100 }, { amount: 200 }],
      error: null 
    })
    // Configurar respuesta para customers (deuda)
    mockSupabase.eq.mockResolvedValueOnce({ 
      data: [{ current_debt: 50 }, { current_debt: 150 }],
      error: null 
    })
    // Configurar respuesta para count de customers
    mockSupabase.eq.mockResolvedValueOnce({ 
      count: 2,
      data: null,
      error: null 
    })
    // Configurar respuesta para count de receipts
    mockSupabase.eq.mockResolvedValueOnce({ 
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
    
    // Configurar respuesta para payments (vacío)
    mockSupabase.gte.mockResolvedValueOnce({ 
      data: [],
      error: null 
    })
    // Configurar respuesta para customers (deuda)
    mockSupabase.eq.mockResolvedValueOnce({ 
      data: [{ current_debt: 50 }, { current_debt: 150 }],
      error: null 
    })
    // Configurar respuesta para count de customers
    mockSupabase.eq.mockResolvedValueOnce({ 
      count: 2,
      data: null,
      error: null 
    })
    // Configurar respuesta para count de receipts
    mockSupabase.eq.mockResolvedValueOnce({ 
      count: 5,
      data: null,
      error: null 
    })

    const service = new DashboardService(mockSupabase as any)
    const kpis = await service.getSummaryKPIs()
    
    expect(kpis.totalDebt).toBe(200)
  })
})
