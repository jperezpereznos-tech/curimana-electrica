import { PeriodRepository } from '@/repositories/period-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { ConceptRepository } from '@/repositories/concept-repository'
import { AuditService } from '@/services/audit-service'
import { calculateEnergyAmount } from '@/lib/billing-utils'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { format, subMonths, setDate } from 'date-fns'
import { es } from 'date-fns/locale'

type ReceiptInsert = Omit<Database['public']['Tables']['receipts']['Insert'], 'receipt_number'>

export class PeriodService {
  private periodRepo: PeriodRepository
  private customerRepo: CustomerRepository
  private readingRepo: ReadingRepository
  private receiptRepo: ReceiptRepository
  private conceptRepo: ConceptRepository
  private auditSvc: AuditService
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.periodRepo = new PeriodRepository(supabaseClient)
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.readingRepo = new ReadingRepository(supabaseClient)
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.conceptRepo = new ConceptRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient ?? createBrowserClient()
  }

  calculatePeriodDates(year: number, month: number, cutDay: number = 26) {
    const currentMonthDate = new Date(year, month - 1, 1)
    const endDate = setDate(currentMonthDate, cutDay - 1)
    const startDate = setDate(subMonths(currentMonthDate, 1), cutDay)

    const name = format(currentMonthDate, 'MMMM yyyy', { locale: es }).toUpperCase()

    return {
      name,
      year,
      month,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      is_closed: false
    }
  }

  async createNextPeriod() {
    const lastPeriod = await this.periodRepo.getCurrentPeriod()
    let nextYear, nextMonth

    if (lastPeriod) {
      nextMonth = lastPeriod.month + 1
      nextYear = lastPeriod.year
      if (nextMonth > 12) {
        nextMonth = 1
        nextYear++
      }
    } else {
      const now = new Date()
      nextYear = now.getFullYear()
      nextMonth = now.getMonth() + 1
    }

    const periodData = this.calculatePeriodDates(nextYear, nextMonth)
    return await this.periodRepo.create(periodData)
  }

  async getAllPeriods() {
    return await this.periodRepo.getAllPeriods()
  }

  async getCurrentPeriod() {
    return await this.periodRepo.getCurrentPeriod()
  }

  async closePeriod(id: string, userId?: string) {
    const period = await this.periodRepo.getById(id)
    if (!period) throw new Error('Periodo no encontrado')
    if (period.is_closed) throw new Error('El periodo ya está cerrado')

    const customers = await this.customerRepo.searchCustomers('')
    const activeCustomers = (customers as any[]).filter((c: any) => c.is_active)
    const activeConcepts = await this.conceptRepo.getAllActive()

    let generatedCount = 0
    const errors: string[] = []

    for (const customer of activeCustomers) {
      try {
        const readings = await this.readingRepo.getReadingsByPeriod(id)
        const customerReading = (readings as any[]).find((r: any) => r.customer_id === customer.id)

        if (!customerReading) continue

        const consumption = customerReading.consumption || 0
        const tariff = customer.tariffs
        const tiers = tariff?.tariff_tiers || []

        let energyAmount = 0
        if (tiers.length > 0) {
          const sortedTiers = [...tiers].sort((a: any, b: any) => a.min_kwh - b.min_kwh)
          energyAmount = calculateEnergyAmount(consumption, sortedTiers)
        }

        let fixedCharges = 0
        for (const concept of activeConcepts) {
          if (concept.type === 'fixed') {
            fixedCharges += concept.amount
          } else if (concept.type === 'percentage') {
            fixedCharges += (energyAmount * concept.amount) / 100
          } else if (concept.type === 'per_kwh') {
            fixedCharges += consumption * concept.amount
          }
        }
        fixedCharges = Math.round(fixedCharges * 100) / 100

        const subtotal = Math.round((energyAmount + fixedCharges) * 100) / 100
        const previousDebt = customer.current_debt || 0
        const totalAmount = Math.round((subtotal + previousDebt) * 100) / 100

        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)

        const receiptPayload: ReceiptInsert = {
          customer_id: customer.id,
          billing_period_id: id,
          reading_id: customerReading.id,
          previous_reading: customerReading.previous_reading || 0,
          current_reading: customerReading.current_reading || 0,
          consumption_kwh: consumption,
          period_start: period.start_date,
          period_end: period.end_date,
          energy_amount: energyAmount,
          fixed_charges: fixedCharges,
          subtotal: subtotal,
          previous_debt: previousDebt,
          total_amount: totalAmount,
          paid_amount: 0,
          status: 'pending',
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
        }

        await this.receiptRepo.create(receiptPayload as any)

        generatedCount++
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`Cliente ${customer.id}: ${msg}`)
      }
    }

    const { data: closeResult, error: closeError } = await this.supabase
      .rpc('close_billing_period', { p_period_id: id })

    if (closeError) throw closeError
    if (!closeResult || closeResult.length === 0 || !closeResult[0].success) throw new Error('El periodo ya está cerrado o no existe')

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'billing_periods',
          record_id: id,
          action: 'UPDATE',
          new_data: { is_closed: true, receipts_generated: generatedCount, errors },
          user_id: userId
        })
      } catch {}
    }

    return { period_id: id, receiptsGenerated: generatedCount, errors }
  }
}

export const periodService = new PeriodService()

export function getPeriodService(supabaseClient: SupabaseClient<Database>) {
  return new PeriodService(supabaseClient)
}
