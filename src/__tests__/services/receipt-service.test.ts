import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReceiptService } from '@/services/receipt-service'
import { ReceiptRepository } from '@/repositories/receipt-repository'
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

  it('debería calcular correctamente para 50 kWh con cargos fijos', () => {
    const result = service.calculateBreakdown(50, mockTiers, mockFixedConcepts)

    expect(result.energyAmount).toBe(21.70)
    expect(result.fixedCharges).toBe(9.20)
    expect(result.subtotal).toBe(30.90)
    expect(result.totalAmount).toBe(30.90)
  })

  it('debería calcular correctamente para 0 kWh (solo cargos fijos)', () => {
    const result = service.calculateBreakdown(0, mockTiers, mockFixedConcepts)

    expect(result.energyAmount).toBe(0)
    expect(result.subtotal).toBe(9.20)
    expect(result.totalAmount).toBe(9.20)
  })

  it('debería incluir la deuda anterior en el total', () => {
    const previousDebt = 15.50
    const result = service.calculateBreakdown(50, mockTiers, mockFixedConcepts, previousDebt)

    expect(result.subtotal).toBe(30.90)
    expect(result.previousDebt).toBe(15.50)
    expect(result.totalAmount).toBe(46.40)
  })

  it('debería manejar conceptos porcentuales adicionales', () => {
    const conceptsWithExtra = [
      ...mockFixedConcepts,
      { name: 'Fondo de Compensación', amount: 5, type: 'percentage' }
    ]
    const result = service.calculateBreakdown(50, mockTiers, conceptsWithExtra)

    const extra = result.conceptsBreakdown.find(c => c.name === 'Fondo de Compensación')
    expect(extra?.amount).toBe(1.55)
  })

  it('debería manejar conceptos por_kwh', () => {
    const conceptsWithPerKwh = [
      ...mockFixedConcepts,
      { name: 'Generación Distribuida', amount: 0.05, type: 'per_kwh' }
    ]
    const result = service.calculateBreakdown(100, mockTiers, conceptsWithPerKwh)

    const perKwhConcept = result.conceptsBreakdown.find(c => c.name === 'Generación Distribuida')
    expect(perKwhConcept?.amount).toBe(5.00)
  })

  it('debería manejar conceptos mixtos (fixed, percentage, per_kwh)', () => {
    const mixedConcepts = [
      { name: 'Cargo Fijo', amount: 3.50, type: 'fixed' },
      { name: 'Fondo Compensación', amount: 5, type: 'percentage' },
      { name: 'Generación', amount: 0.10, type: 'per_kwh' }
    ]
    const result = service.calculateBreakdown(50, mockTiers, mixedConcepts)

    const fixedConcept = result.conceptsBreakdown.find(c => c.name === 'Cargo Fijo')
    const pctConcept = result.conceptsBreakdown.find(c => c.name === 'Fondo Compensación')
    const perKwhConcept = result.conceptsBreakdown.find(c => c.name === 'Generación')

    expect(fixedConcept?.amount).toBe(3.50)
    expect(pctConcept?.amount).toBe(1.26)
    expect(perKwhConcept?.amount).toBe(5.00)
  })

  it('debería funcionar con lista de conceptos vacía', () => {
    const result = service.calculateBreakdown(50, mockTiers, [])

    expect(result.energyAmount).toBe(21.70)
    expect(result.fixedCharges).toBe(0)
    expect(result.subtotal).toBe(21.70)
    expect(result.conceptsBreakdown).toEqual([])
  })

  it('debería funcionar con lista de tiers vacía', () => {
    const result = service.calculateBreakdown(50, [], mockFixedConcepts)

    expect(result.energyAmount).toBe(0)
    expect(result.fixedCharges).toBe(9.20)
    expect(result.subtotal).toBe(9.20)
  })

  it('debería calcular consumo en el tier más alto (sin max_kwh)', () => {
    const result = service.calculateBreakdown(200, mockTiers, mockFixedConcepts)

    expect(result.energyAmount).toBe(116.70)
    expect(result.subtotal).toBe(125.90)
  })

  it('debería redondear correctamente a 2 decimales', () => {
    const trickyTiers = [
      { min_kwh: 0, max_kwh: 10, price_per_kwh: 0.333 },
      { min_kwh: 10, max_kwh: null, price_per_kwh: 0.777 }
    ]
    const result = service.calculateBreakdown(15, trickyTiers, [])

    expect(Number.isInteger(result.energyAmount * 100)).toBe(true)
    expect(Number.isInteger(result.totalAmount * 100)).toBe(true)
  })

  it('debería calcular percentage sobre la acumulación de energy + conceptos previos', () => {
    const concepts = [
      { name: 'Cargo Fijo', amount: 10, type: 'fixed' },
      { name: 'Impuesto 10%', amount: 10, type: 'percentage' }
    ]
    const result = service.calculateBreakdown(30, mockTiers, concepts)

    const fixedItem = result.conceptsBreakdown.find(c => c.name === 'Cargo Fijo')
    const pctItem = result.conceptsBreakdown.find(c => c.name === 'Impuesto 10%')

    expect(fixedItem?.amount).toBe(10)
    expect(pctItem?.amount).toBe(1.93)
  })
})

describe('ReceiptService - getAllReceipts', () => {
  const mockSupabase = createMockSupabase()
  const service = new ReceiptService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería delegar al repositorio sin filtros', async () => {
    const mockReceipts = [
      { id: 'r1', receipt_number: 1, status: 'pending' },
      { id: 'r2', receipt_number: 2, status: 'paid' }
    ]

    vi.spyOn(ReceiptRepository.prototype, 'getAllWithDetails').mockResolvedValue(mockReceipts as any)

    const result = await service.getAllReceipts()

    expect(ReceiptRepository.prototype.getAllWithDetails).toHaveBeenCalledWith(undefined)
    expect(result).toEqual(mockReceipts)
  })

  it('debería pasar filtros al repositorio', async () => {
    const filters = { periodId: 'p1', status: 'pending', customerId: 'c1' }
    const mockReceipts = [{ id: 'r1', status: 'pending' }]

    vi.spyOn(ReceiptRepository.prototype, 'getAllWithDetails').mockResolvedValue(mockReceipts as any)

    const result = await service.getAllReceipts(filters)

    expect(ReceiptRepository.prototype.getAllWithDetails).toHaveBeenCalledWith(filters)
    expect(result).toEqual(mockReceipts)
  })

  it('debería pasar filtros parciales al repositorio', async () => {
    const filters = { status: 'paid' }

    vi.spyOn(ReceiptRepository.prototype, 'getAllWithDetails').mockResolvedValue([] as any)

    await service.getAllReceipts(filters)

    expect(ReceiptRepository.prototype.getAllWithDetails).toHaveBeenCalledWith({ status: 'paid' })
  })
})

describe('ReceiptService - getReceiptByNumber', () => {
  const mockSupabase = createMockSupabase()
  const service = new ReceiptService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería delegar al repositorio con receipt_number', async () => {
    const mockReceipt = { id: 'r1', receipt_number: 42, status: 'pending' }
    vi.spyOn(ReceiptRepository.prototype, 'getByReceiptNumber').mockResolvedValue(mockReceipt as any)

    const result = await service.getReceiptByNumber(42)

    expect(ReceiptRepository.prototype.getByReceiptNumber).toHaveBeenCalledWith(42)
    expect(result).toEqual(mockReceipt)
  })

  it('debería retornar null si el recibo no existe', async () => {
    vi.spyOn(ReceiptRepository.prototype, 'getByReceiptNumber').mockResolvedValue(null)

    const result = await service.getReceiptByNumber(9999)

    expect(result).toBeNull()
  })
})

describe('ReceiptService - getReceiptDetails', () => {
  const mockSupabase = createMockSupabase()
  const service = new ReceiptService(mockSupabase)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería delegar al repositorio con el id', async () => {
    const mockDetail = {
      id: 'r1',
      receipt_number: 1,
      customers: { full_name: 'Juan', tariffs: { name: 'BTSB', tariff_tiers: [] } },
      billing_periods: { name: 'Enero 2025' },
      readings: { current_reading: 100, previous_reading: 80 }
    }

    vi.spyOn(ReceiptRepository.prototype, 'getByIdWithDetails').mockResolvedValue(mockDetail as any)

    const result = await service.getReceiptDetails('r1')

    expect(ReceiptRepository.prototype.getByIdWithDetails).toHaveBeenCalledWith('r1')
    expect(result).toEqual(mockDetail)
  })

  it('debería propagar error si el repositorio falla', async () => {
    vi.spyOn(ReceiptRepository.prototype, 'getByIdWithDetails').mockRejectedValue(new Error('Not found'))

    await expect(service.getReceiptDetails('missing')).rejects.toThrow('Not found')
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

    await expect(service.cancelReceipt('r1', 'razón')).rejects.toThrow('No se puede anular un recibo con pagos registrados. Anule los pagos primero.')
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
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({} as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.cancelReceipt('r1', 'razón')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería lanzar error si RPC de recálculo de deuda falla después de actualizar', async () => {
    const mockReceipt = { id: 'r1', status: 'pending', total_amount: 100, paid_amount: 0, customer_id: 'c1' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({ id: 'r1', status: 'cancelled' } as any)
    ;(mockSupabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: { message: 'RPC connection failed' } })

    await expect(service.cancelReceipt('r1', 'razón')).rejects.toThrow('Recibo anulado pero error al recalcular deuda del cliente: Error al recalcular deuda: RPC connection failed')
  })

  it('debería permitir anular recibo con paid_amount cercano a cero (tolerancia 0.005)', async () => {
    const mockReceipt = { id: 'r1', status: 'pending', total_amount: 100, paid_amount: 0.004, customer_id: 'c1' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({ id: 'r1', status: 'cancelled' } as any)

    const result = await service.cancelReceipt('r1', 'razón')

    expect(ReceiptRepository.prototype.update).toHaveBeenCalledWith('r1', { status: 'cancelled' })
    expect(result).toEqual({ id: 'r1', status: 'cancelled' })
  })

  it('debería registrar auditoría con datos correctos', async () => {
    const mockReceipt = { id: 'r1', status: 'pending', total_amount: 100, paid_amount: 0, customer_id: 'c1' }

    vi.spyOn(ReceiptRepository.prototype, 'getById').mockResolvedValue(mockReceipt as any)
    vi.spyOn(ReceiptRepository.prototype, 'update').mockResolvedValue({ id: 'r1', status: 'cancelled' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.cancelReceipt('r1', 'Error en lectura', 'admin1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith({
      table_name: 'receipts',
      record_id: 'r1',
      action: 'UPDATE',
      old_data: { status: 'pending' },
      new_data: { status: 'cancelled', reason: 'Error en lectura' },
      user_id: 'admin1'
    })
  })
})
