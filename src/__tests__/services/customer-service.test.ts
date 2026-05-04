import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomerService } from '@/services/customer-service'
import { CustomerRepository } from '@/repositories/customer-repository'

vi.mock('@/repositories/customer-repository')

describe('CustomerService', () => {
  const service = new CustomerService()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchCustomers', () => {
    it('debería delegar la búsqueda al repositorio con trimmed query', async () => {
      const mockResults = [{ id: 'c1', full_name: 'Juan Pérez' }]
      vi.spyOn(CustomerRepository.prototype, 'searchCustomers').mockResolvedValue(mockResults as any)

      const result = await service.searchCustomers('  juan  ')

        expect(CustomerRepository.prototype.searchCustomers).toHaveBeenCalledWith('juan', undefined)
      expect(result).toEqual(mockResults)
    })
  })

  describe('registerCustomer', () => {
    it('debería crear el cliente con el supply_number proporcionado', async () => {
      vi.spyOn(CustomerRepository.prototype, 'create').mockResolvedValue({ id: 'c1', supply_number: '123456789' } as any)

      await service.registerCustomer({
        supply_number: '123456789',
        full_name: 'Juan Pérez',
        document_number: '12345678',
        address: 'Av. Principal 123',
        sector: 'Centro',
        tariff_id: 't1',
        connection_type: 'monofásico',
        is_active: true,
        current_debt: 0,
      } as any)

      expect(CustomerRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({ supply_number: '123456789', full_name: 'Juan Pérez' })
      )
    })
  })

  describe('updateCustomer', () => {
    it('debería delegar la actualización al repositorio', async () => {
      vi.spyOn(CustomerRepository.prototype, 'update').mockResolvedValue({ id: 'c1', is_active: false } as any)

      await service.updateCustomer('c1', { is_active: false } as any)

      expect(CustomerRepository.prototype.update).toHaveBeenCalledWith('c1', { is_active: false })
    })
  })

  describe('getCustomersWithDebt', () => {
    it('debería llamar a getTopDebtors con limite 1000', async () => {
      const mockDebtors = [{ id: 'c1', current_debt: 50 }]
      vi.spyOn(CustomerRepository.prototype, 'getTopDebtors').mockResolvedValue(mockDebtors as any)

      const result = await service.getCustomersWithDebt()

      expect(CustomerRepository.prototype.getTopDebtors).toHaveBeenCalledWith(1000)
      expect(result).toEqual(mockDebtors)
    })
  })
})
