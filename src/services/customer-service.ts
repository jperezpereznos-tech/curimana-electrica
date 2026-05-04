import { CustomerRepository } from '@/repositories/customer-repository'
import { AuditService } from '@/services/audit-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

type CustomerInsert = Omit<Database['public']['Tables']['customers']['Insert'], 'id' | 'created_at' | 'updated_at'>

export class CustomerService {
  private customerRepo: CustomerRepository
  private auditSvc: AuditService
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient ?? createBrowserClient()
  }

  async searchCustomers(query: string, sectorId?: string) {
    return await this.customerRepo.searchCustomers(query.trim(), sectorId)
  }

  async getCustomerDetails(id: string) {
    return await this.customerRepo.getCustomerDetails(id)
  }

  async registerCustomer(customerData: CustomerInsert, userId?: string) {
    const customer = await this.customerRepo.create(customerData)

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'customers',
          record_id: customer.id,
          action: 'INSERT',
          new_data: { supply_number: customerData.supply_number, full_name: customerData.full_name },
          user_id: userId
        })
      } catch {}
    }

    return customer
  }

  async updateCustomer(id: string, customerData: Partial<CustomerInsert>, userId?: string) {
    const customer = await this.customerRepo.update(id, customerData)

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'customers',
          record_id: id,
          action: 'UPDATE',
          new_data: customerData,
          user_id: userId
        })
      } catch {}
    }

    return customer
  }

  async getTopDebtors(limit: number = 5) {
    return await this.customerRepo.getTopDebtors(limit)
  }

  async getCustomersWithDebt() {
    return await this.customerRepo.getTopDebtors(1000)
  }

  async getActiveCustomersWithReadings(sectorId?: string) {
    return await this.customerRepo.getActiveCustomersWithReadings(sectorId)
  }

  async getAllForCache(sectorId?: string) {
    return await this.customerRepo.getAllForCache(sectorId)
  }
}

export const customerService = new CustomerService()

export function getCustomerService(supabaseClient: SupabaseClient<Database>) {
  return new CustomerService(supabaseClient)
}
