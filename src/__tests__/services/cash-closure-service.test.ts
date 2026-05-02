import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CashClosureService } from '@/services/cash-closure-service'
import { CashClosureRepository } from '@/repositories/cash-closure-repository'
import { PaymentRepository } from '@/repositories/payment-repository'

vi.mock('@/repositories/cash-closure-repository')
vi.mock('@/repositories/payment-repository')
vi.mock('@/services/audit-service')

describe('CashClosureService', () => {
  const service = new CashClosureService()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('openClosure', () => {
    it('debería crear un cierre con estado open y monto inicial', async () => {
      vi.spyOn(CashClosureRepository.prototype, 'getActiveClosure').mockResolvedValue(null)
      vi.spyOn(CashClosureRepository.prototype, 'create').mockResolvedValue({ id: 'cl1' } as any)

      await service.openClosure('user1', 200)

      expect(CashClosureRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cashier_id: 'user1',
          opening_amount: 200,
          total_collected: 0,
          total_receipts: 0,
          status: 'open'
        })
      )
    })
  })

  describe('closeClosure', () => {
    it('debería calcular totales y cerrar el cierre', async () => {
      const mockClosure = { id: 'cl1', cashier_id: 'user1', status: 'open', created_at: '2026-05-01T00:00:00Z' }
      const mockPayments = [
        { amount: 50, receipt_id: 'r1' },
        { amount: 30, receipt_id: 'r2' },
        { amount: 20, receipt_id: 'r1' },
      ]

      vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue(mockClosure as any)
      vi.spyOn(PaymentRepository.prototype, 'getPaymentsByCashier').mockResolvedValue(mockPayments as any)
      vi.spyOn(CashClosureRepository.prototype, 'close').mockResolvedValue({ id: 'cl1', status: 'closed' } as any)

      await service.closeClosure('cl1')

      expect(PaymentRepository.prototype.getPaymentsByCashier).toHaveBeenCalledWith('user1', expect.objectContaining({
        from: '2026-05-01T00:00:00Z'
      }))
      expect(CashClosureRepository.prototype.close).toHaveBeenCalledWith('cl1', expect.objectContaining({
        total_collected: 100,
        total_receipts: 2
      }))
    })

    it('debería lanzar error si el cierre no existe', async () => {
      vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue(null as any)

      await expect(service.closeClosure('missing')).rejects.toThrow('No se encontro el cierre de caja')
    })

    it('debería lanzar error si el cierre no tiene cajero', async () => {
      vi.spyOn(CashClosureRepository.prototype, 'getById').mockResolvedValue({ id: 'cl1', cashier_id: null, status: 'open' } as any)

      await expect(service.closeClosure('cl1')).rejects.toThrow('El cierre no tiene cajero asociado')
    })
  })
})
