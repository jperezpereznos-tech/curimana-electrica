import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReceiptService } from '@/services/receipt-service'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { AuditService } from '@/services/audit-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

vi.mock('@/repositories/receipt-repository')
vi.mock('@/repositories/customer-repository')
vi.mock('@/services/audit-service')

function createMockSupabase() {
  return {
    rpc: vi.fn().mockResolvedValue({ data: 0, error: null })
  } as unknown as SupabaseClient<Database>
}

describe('ReceiptService - calculateBreakdown', () => {
  const mockSupabase = createMockSupabase()
  const service = new ReceiptService(mockSupabase)

  const mockTiers = [
    { min_kwh: 0, max_kwh: 30, price_per_kwh: 0.31 },
    { min_kwh: 30, max_kwh: 100, price_per_kwh: 0.62 },
    { min_kwh: 100, max_kwh: null, price_per_kwh: 0.64 }
  ]

  const mockFixedConcepts = [
    { name: 'Cargo Fijo', amount: 3.50, type: 'fixed' },
    { name: 'Alumbrado Público', amount: 4.20, type: 'fixed' },
    { name: 'Mantenimiento', amount: 1.50, type: 'fixed' }
  ]

  it('debería calcular correctamente para 50 kWh con cargos fijos e IGV', () => {
    const result = service.calculateBreakdown(50, mockTiers, mockFixedConcepts)

    expect(result.energyAmount).toBe(21.70)
    expect(result.fixedCharges).toBe(9.20)
    expect(result.subtotal).toBe(30.90)
    expect(result.igv).toBe(5.56)
    expect(result.totalAmount).toBe(36.46)
  })

  it('debería calcular correctamente para 0 kWh (solo cargos fijos + IGV)', () => {
    const result = service.calculateBreakdown(0, mockTiers, mockFixedConcepts)

    expect(result.energyAmount).toBe(0)
    expect(result.subtotal).toBe(9.20)
    expect(result.igv).toBe(1.66)
    expect(result.totalAmount).toBe(10.86)
  })

  it('debería incluir la deuda anterior en el total', () => {
    const previousDebt = 15.50
    const result = service.calculateBreakdown(50, mockTiers, mockFixedConcepts, previousDebt)

    expect(result.subtotal).toBe(30.90)
    expect(result.igv).toBe(5.56)
    expect(result.previousDebt).toBe(15.50)
    expect(result.totalAmount).toBe(51.96)
  })

  it('debería manejar conceptos porcentuales adicionales', () => {
    const conceptsWithExtra = [
      ...mockFixedConcepts,
      { name: 'Fondo de Compensación', amount: 5, type: 'percentage' }
    ]
    const result = service.calculateBreakdown(50, mockTiers, conceptsWithExtra)

    const extra = result.conceptsBreakdown.find(c => c.name === 'Fondo de Compensación')
    expect(extra?.amount).toBe(1.09)
  })
})

describe('ReceiptService - cancelReceipt', () => {
  const mockSupabase = createMockSupabase()
  const service = new ReceiptService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: 0, error: null })
  })

  it('debería anular el recibo sin pagos y recalcular la deuda del cliente via RPC', async () => {
    const mockReceipt = { id: 'r1', status: 'pending', total_amount: 100, paid_amount: 0, customer_id: 'c1' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue({ id: 'c1', current_debt: 100 } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({ id: 'r1', status: 'cancelled' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.cancelReceipt('r1', 'Anulación', 'user1')

    expect(ReceiptRepository.prototype.update).toHaveBeenCalledWith('r1', { status: 'cancelled' })
    expect(mockSupabase.rpc).toHaveBeenCalledWith('recalculate_customer_debt', {
      p_customer_id: 'c1'
    })
    expect(AuditService.prototype.log).toHaveBeenCalled()
  })

  it('debería lanzar error si el recibo tiene pagos registrados', async () => {
    const mockReceipt = { id: 'r1', status: 'partial', total_amount: 100, paid_amount: 30, customer_id: 'c1' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)

    await expect(service.cancelReceipt('r1', 'razón')).rejects.toThrow('No se puede anular un recibo con pagos registrados')
  })

  it('debería lanzar error si el recibo no existe', async () => {
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(null as any)

    await expect(service.cancelReceipt('missing', 'razón')).rejects.toThrow('Recibo no encontrado')
  })

  it('debería lanzar error si el recibo ya está anulado', async () => {
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', status: 'cancelled', paid_amount: 0 } as any)

    await expect(service.cancelReceipt('r1', 'razón')).rejects.toThrow('El recibo ya está anulado')
  })

  it('debería lanzar error si el recibo no tiene cliente asociado', async () => {
    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue({ id: 'r1', status: 'pending', total_amount: 100, paid_amount: 0, customer_id: null } as any)

    await expect(service.cancelReceipt('r1', 'razón')).rejects.toThrow('Recibo sin cliente asociado')
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    const mockReceipt = { id: 'r1', status: 'pending', total_amount: 100, paid_amount: 0, customer_id: 'c1' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(CustomerRepository.prototype, 'getById').mockResolvedValue({ id: 'c1', current_debt: 100 } as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.cancelReceipt('r1', 'razón')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })
})