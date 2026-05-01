import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditService } from '@/services/audit-service'
import { AuditRepository } from '@/repositories/audit-repository'

vi.mock('@/repositories/audit-repository')

describe('AuditService', () => {
  const service = new AuditService()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('log', () => {
    it('debería registrar un log con ip_address por defecto', async () => {
      vi.spyOn(AuditRepository.prototype, 'create').mockResolvedValue({ id: 'a1' } as any)

      await service.log({
        table_name: 'receipts',
        record_id: 'r1',
        action: 'UPDATE',
        old_data: { status: 'pending' },
        new_data: { status: 'cancelled' },
        user_id: 'user1'
      })

      expect(AuditRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({
          table_name: 'receipts',
          record_id: 'r1',
          action: 'UPDATE',
          ip_address: '0.0.0.0'
        })
      )
    })

    it('no debería lanzar error si el repositorio falla', async () => {
      vi.spyOn(AuditRepository.prototype, 'create').mockRejectedValue(new Error('DB error'))

      await expect(service.log({
        table_name: 'test',
        record_id: '1',
        action: 'INSERT'
      })).resolves.toBeUndefined()
    })
  })

  describe('getAuditLogs', () => {
    it('debería delegar al repositorio', async () => {
      const mockLogs = [{ id: 'a1', action: 'INSERT' }]
      vi.spyOn(AuditRepository.prototype, 'getAllLogs').mockResolvedValue(mockLogs as any)

      const result = await service.getAuditLogs()

      expect(AuditRepository.prototype.getAllLogs).toHaveBeenCalled()
      expect(result).toEqual(mockLogs)
    })
  })
})
