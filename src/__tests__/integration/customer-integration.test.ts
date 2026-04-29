import { describe, it, expect, vi } from 'vitest'
import { customerService } from '@/services/customer-service'
import { customerRepository } from '@/repositories/customer-repository'

// Mock del repositorio
vi.mock('@/repositories/customer-repository', () => ({
  customerRepository: {
    generateSupplyNumber: vi.fn(),
    searchCustomers: vi.fn(),
    create: vi.fn(),
  }
}))

describe('Customer Management Integration Flow', () => {
  it('debería registrar un cliente con número de suministro generado automáticamente', async () => {
    const mockSupplyNumber = '202604001'
    const customerData = {
      full_name: 'Juan Perez',
      address: 'Calle Falsa 123',
      sector: 'Sector 1',
      tariff_id: 'tariff-uuid',
      connection_type: 'monofásico' as const,
      document_number: '12345678',
      phone: '987654321',
      is_active: true
    }

    vi.mocked(customerRepository.generateSupplyNumber).mockResolvedValue(mockSupplyNumber)
    vi.mocked(customerRepository.create).mockImplementation(async (data) => ({
      id: 'new-uuid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_debt: 0,
      ...data
    } as any))

    const result = await customerService.registerCustomer(customerData)

    expect(customerRepository.generateSupplyNumber).toHaveBeenCalled()
    expect(customerRepository.create).toHaveBeenCalledWith({
      ...customerData,
      supply_number: mockSupplyNumber
    })
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

    vi.mocked(customerRepository.searchCustomers).mockResolvedValue([mockCustomer] as any)

    const results = await customerService.searchCustomers('202604999')

    expect(customerRepository.searchCustomers).toHaveBeenCalledWith('202604999')
    expect(results).toHaveLength(1)
    expect(results[0].supply_number).toBe('202604999')
  })
})
