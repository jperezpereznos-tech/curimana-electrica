import { describe, it, expect, vi } from 'vitest'
import { CustomerService } from '@/services/customer-service'
import { CustomerRepository } from '@/repositories/customer-repository'

vi.mock('@/repositories/customer-repository')

describe('Customer Management Integration Flow', () => {
  const service = new CustomerService()
  const proto = CustomerRepository.prototype

  it('debería registrar un cliente con número de suministro proporcionado', async () => {
    const mockSupplyNumber = '202604001'
    const customerData = {
      supply_number: mockSupplyNumber,
      full_name: 'Juan Perez',
      address: 'Calle Falsa 123',
      sector: 'Sector 1',
      tariff_id: 'tariff-uuid',
      connection_type: 'monofásico' as const,
      document_number: '12345678',
      phone: '987654321',
      is_active: true,
      current_debt: 0,
    }

    vi.spyOn(proto, 'create').mockImplementation(async (data: any) => ({
      id: 'new-uuid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data
    }))

    const result = await service.registerCustomer(customerData as any)

    expect(proto.create).toHaveBeenCalledWith(customerData)
    expect(result.supply_number).toBe(mockSupplyNumber)
    expect(result.full_name).toBe('Juan Perez')
  })

  it('debería encontrar un cliente por su número de suministro', async () => {
    const mockCustomer = {
      id: 'uuid-123',
      full_name: 'Maria Garcia',
      supply_number: '202604999',
      current_debt: 0
    }

    vi.spyOn(proto, 'searchCustomers').mockResolvedValue([mockCustomer] as any)

    const results = await service.searchCustomers('202604999')

    expect(proto.searchCustomers).toHaveBeenCalledWith('202604999')
    expect(results).toHaveLength(1)
    expect(results[0].supply_number).toBe('202604999')
  })
})
