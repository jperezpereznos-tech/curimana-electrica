import { BaseRepository } from './base'
import { Database } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']

export class CustomerRepository extends BaseRepository<'customers'> {
  constructor() {
    super('customers')
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    // Requiere al menos 2 caracteres para buscar
    if (!query || query.length < 2) {
      return []
    }
    
    // Búsqueda por nombre, suministro o documento
    const { data, error } = await this.supabase
      .from('customers')
      .select('*, tariffs(name)')
      .or(`full_name.ilike.%${query}%,supply_number.ilike.%${query}%,document_number.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(50)

    if (error) throw error
    return data as any
  }

  async getCustomerDetails(id: string) {
    
    // Obtener cliente con su tarifa
    const { data: customer, error: customerError } = await this.supabase
      .from('customers')
      .select('*, tariffs(*)')
      .eq('id', id)
      .single()

    if (customerError) throw customerError

    // Obtener historial de lecturas
    const { data: readings, error: readingsError } = await this.supabase
      .from('readings')
      .select('*, billing_periods(*)')
      .eq('customer_id', id)
      .order('reading_date', { ascending: false })
      .limit(12)

    // Obtener historial de recibos
    const { data: receipts, error: receiptsError } = await this.supabase
      .from('receipts')
      .select('*, billing_periods(*)')
      .eq('customer_id', id)
      .order('issue_date', { ascending: false })
      .limit(12)

    return {
      customer,
      readings: readings || [],
      receipts: receipts || []
    }
  }

  async generateSupplyNumber(): Promise<string> {
    // Generar un número de suministro único de 9 dígitos.
    // Formato: Año (2) + Mes (2) + Secuencial (5)
    // Para asegurar unicidad simple, usaremos un prefijo y un número aleatorio,
    // verificando que no exista.
    let unique = false
    let supplyNumber = ''
    
    while (!unique) {
      const random = Math.floor(100000000 + Math.random() * 900000000).toString()
      supplyNumber = random
      
      const { count } = await this.supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('supply_number', supplyNumber)
        
      if (count === 0) unique = true
    }
    
    return supplyNumber
  }
}

export const customerRepository = new CustomerRepository()
