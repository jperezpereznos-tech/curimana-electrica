import { customerRepository } from '@/repositories/customer-repository'
import { Database } from '@/types/database'

type CustomerInsert = Omit<Database['public']['Tables']['customers']['Insert'], 'id' | 'created_at' | 'updated_at'>

export class CustomerService {
  async searchCustomers(query: string) {
    if (!query || query.trim().length < 2) {
      return [] // Evitar búsquedas muy cortas
    }
    return await customerRepository.searchCustomers(query.trim())
  }

  async getCustomerDetails(id: string) {
    return await customerRepository.getCustomerDetails(id)
  }

  async registerCustomer(customerData: Omit<CustomerInsert, 'supply_number'>) {
    // Generar supply_number de 9 dígitos automáticamente
    const supply_number = await customerRepository.generateSupplyNumber()
    
    return await customerRepository.create({
      ...customerData,
      supply_number
    })
  }

  async updateCustomer(id: string, customerData: Partial<CustomerInsert>) {
    return await customerRepository.update(id, customerData)
  }
}

export const customerService = new CustomerService()
