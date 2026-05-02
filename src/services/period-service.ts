import { PeriodRepository } from '@/repositories/period-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { AuditService } from '@/services/audit-service'
import { calculateEnergyAmount } from '@/lib/billing-utils'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { format, subMonths, setDate } from 'date-fns'
import { es } from 'date-fns/locale'

export class PeriodService {
  private periodRepo: PeriodRepository
  private customerRepo: CustomerRepository
  private readingRepo: ReadingRepository
  private receiptRepo: ReceiptRepository
  private auditSvc: AuditService

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.periodRepo = new PeriodRepository(supabaseClient)
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.readingRepo = new ReadingRepository(supabaseClient)
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
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

    const customers = await this.customerRepo.searchCustomers('')
    const activeCustomers = (customers as any[]).filter((c: any) => c.is_active)

    let generatedCount = 0

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

        const fixedCharges = 0
        const subtotal = energyAmount + fixedCharges
        const previousDebt = customer.current_debt || 0
        const totalAmount = Math.round((subtotal + previousDebt) * 100) / 100

        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 30)

        await this.receiptRepo.create({
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
        } as any)

        generatedCount++
      } catch (error) {
        console.error(`Error generating receipt for customer ${customer.id}:`, error)
      }
    }

    const result = await this.periodRepo.update(id, {
      is_closed: true,
      closed_at: new Date().toISOString()
    })

    if (userId) {
      await this.auditSvc.log({
        table_name: 'billing_periods',
        record_id: id,
        action: 'UPDATE',
        new_data: { is_closed: true, receipts_generated: generatedCount },
        user_id: userId
      })
    }

    return { ...result, receiptsGenerated: generatedCount }
  }
}

export const periodService = new PeriodService()

export function getPeriodService(supabaseClient: SupabaseClient<Database>) {
  return new PeriodService(supabaseClient)
}
