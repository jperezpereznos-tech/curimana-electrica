import { CustomerRepository } from '@/repositories/customer-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type CustomerInsert = Omit<Database['public']['Tables']['customers']['Insert'], 'id' | 'created_at' | 'updated_at'>

export class CustomerService {
  private customerRepo: CustomerRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.customerRepo = new CustomerRepository(supabaseClient)
  }

  async searchCustomers(query: string) {
    if (!query || query.trim().length < 2) {
      return []
    }
    return await this.customerRepo.searchCustomers(query.trim())
  }

  async getCustomerDetails(id: string) {
    return await this.customerRepo.getCustomerDetails(id)
  }

  async registerCustomer(customerData: Omit<CustomerInsert, 'supply_number'>) {
    const supply_number = await this.customerRepo.generateSupplyNumber()

    return await this.customerRepo.create({
      ...customerData,
      supply_number
    })
  }

  async updateCustomer(id: string, customerData: Partial<CustomerInsert>) {
    return await this.customerRepo.update(id, customerData)
  }
}

export const customerService = new CustomerService()

export function getCustomerService(supabaseClient: SupabaseClient<Database>) {
  return new CustomerService(supabaseClient)
}
