import { PeriodRepository } from '@/repositories/period-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { ConceptRepository } from '@/repositories/concept-repository'
import { AuditService } from '@/services/audit-service'
import { calculateEnergyAmount, calculateTotalReceipt } from '@/lib/billing-utils'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { format, subMonths, setDate } from 'date-fns'
import { es } from 'date-fns/locale'

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

  async createNextPeriod(userId?: string) {
    const openPeriod = await this.periodRepo.getCurrentPeriod()
    if (openPeriod && !openPeriod.is_closed) {
      throw new Error('No se puede crear un nuevo periodo mientras exista uno abierto')
    }

    const lastPeriod = await this.getLastPeriod()
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

    const { data: config } = await this.supabase
      .from('municipality_config')
      .select('billing_cut_day')
      .limit(1)
      .single()

    const cutDay = config?.billing_cut_day || 26
    const periodData = this.calculatePeriodDates(nextYear, nextMonth, cutDay)
    const result = await this.periodRepo.create(periodData)

    if (userId && result) {
      try {
        await this.auditSvc.log({
          table_name: 'billing_periods',
          record_id: result.id,
          action: 'INSERT',
          new_data: periodData,
          user_id: userId
        })
      } catch (e) {
        console.error('Audit log failed for createNextPeriod:', e)
      }
    }

    return result
  }

  private async getLastPeriod() {
    const { data, error } = await this.supabase
      .from('billing_periods')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
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

    const { data: config } = await this.supabase
      .from('municipality_config')
      .select('payment_grace_days')
      .limit(1)
      .single()

    const graceDays = config?.payment_grace_days || 20

    const { data: activeCustomersData } = await this.supabase
      .from('customers')
      .select('*, tariffs(*, tariff_tiers(*))')
      .eq('is_active', true)

    const activeCustomers = activeCustomersData || []
    const activeConcepts = await this.conceptRepo.getAllActive()
    const allReadings = await this.readingRepo.getReadingsByPeriod(id)

    let generatedCount = 0
    const skippedCustomers: string[] = []
    const errors: string[] = []

    for (const customer of activeCustomers) {
      try {
        const customerReadings = (allReadings as any[]).filter((r: any) => r.customer_id === customer.id)
        if (customerReadings.length === 0) {
          skippedCustomers.push(customer.supply_number || customer.id)
          continue
        }
        const customerReading = customerReadings.sort((a: any, b: any) =>
          new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
        )[0]

        const consumption = customerReading.consumption || 0
        const tariff = customer.tariffs
        const tiers = tariff?.tariff_tiers || []

    let fixedCharges = 0
      let percentageBase = 0

      for (const concept of activeConcepts) {
        if (concept.applies_to_tariff_id && concept.applies_to_tariff_id !== customer.tariff_id) {
          continue
        }

        if (concept.type === 'fixed') {
          fixedCharges += concept.amount
        } else if (concept.type === 'per_kwh') {
          fixedCharges += consumption * concept.amount
        }
      }

      const sortedTiers = tiers.length > 0
        ? [...tiers].sort((a: any, b: any) => a.min_kwh - b.min_kwh)
        : []

      percentageBase = (sortedTiers.length > 0 ? calculateEnergyAmount(consumption, sortedTiers) : 0) + fixedCharges

      for (const concept of activeConcepts) {
        if (concept.applies_to_tariff_id && concept.applies_to_tariff_id !== customer.tariff_id) {
          continue
        }

        if (concept.type === 'percentage') {
          fixedCharges += (percentageBase * concept.amount) / 100
        }
      }

      fixedCharges = Math.round(fixedCharges * 100) / 100
      const previousDebt = customer.current_debt || 0

      const receipt = calculateTotalReceipt(consumption, sortedTiers, fixedCharges, previousDebt)

      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + graceDays)

      const receiptPayload: Database['public']['Tables']['receipts']['Insert'] = {
        customer_id: customer.id,
        billing_period_id: id,
        reading_id: customerReading.id,
        previous_reading: customerReading.previous_reading || 0,
        current_reading: customerReading.current_reading || 0,
        consumption_kwh: consumption,
        period_start: period.start_date,
        period_end: period.end_date,
        energy_amount: receipt.energy_amount,
        fixed_charges: receipt.fixed_charges,
        subtotal: receipt.subtotal,
        igv: receipt.igv,
        previous_debt: previousDebt,
        total_amount: receipt.total_amount,
        paid_amount: 0,
        status: 'pending',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
      }

        await this.receiptRepo.create(receiptPayload)

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
          new_data: { is_closed: true, receipts_generated: generatedCount, skipped: skippedCustomers.length, errors },
          user_id: userId
        })
      } catch (e) {
        console.error('Audit log failed for closePeriod:', e)
      }
    }

    return { period_id: id, receiptsGenerated: generatedCount, skipped: skippedCustomers.length, errors }
  }
}

export const periodService = new PeriodService()

export function getPeriodService(supabaseClient: SupabaseClient<Database>) {
  return new PeriodService(supabaseClient)
}
