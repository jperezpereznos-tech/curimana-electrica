import { PeriodRepository } from '@/repositories/period-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { ConceptRepository } from '@/repositories/concept-repository'
import { MunicipalityConfigRepository } from '@/repositories/municipality-config-repository'
import { AuditService } from '@/services/audit-service'
import { calculateEnergyAmount, calculateTotalReceipt } from '@/lib/billing-utils'
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
  private configRepo: MunicipalityConfigRepository
  private auditSvc: AuditService
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.periodRepo = new PeriodRepository(supabaseClient)
    this.customerRepo = new CustomerRepository(supabaseClient)
    this.readingRepo = new ReadingRepository(supabaseClient)
    this.receiptRepo = new ReceiptRepository(supabaseClient)
    this.conceptRepo = new ConceptRepository(supabaseClient)
    this.configRepo = new MunicipalityConfigRepository(supabaseClient)
    this.auditSvc = new AuditService(supabaseClient)
    this.supabase = supabaseClient
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
    const [openPeriod, lastPeriodResult] = await Promise.all([
      this.periodRepo.getCurrentPeriod(),
      this.getLastPeriod(),
    ])

    if (openPeriod && !openPeriod.is_closed) {
      throw new Error('No se puede crear un nuevo periodo mientras exista uno abierto')
    }

    const lastPeriod = lastPeriodResult
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

    const cutDay = await this.configRepo.getBillingCutDay()
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

    if (error) throw new Error(error.message)
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

    const [graceDays, activeCustomersResult, activeConcepts, allReadings] = await Promise.all([
      this.configRepo.getPaymentGraceDays(),
      this.supabase
        .from('customers')
        .select('*, tariffs(*, tariff_tiers(*))')
        .eq('is_active', true),
      this.conceptRepo.getAllActive(),
      this.readingRepo.getReadingsByPeriod(id),
    ])

    if (activeCustomersResult.error) throw activeCustomersResult.error

    const activeCustomers = activeCustomersResult.data || []

    if (allReadings.length === 0) {
      throw new Error('No se puede cerrar el periodo sin lecturas registradas. Registre lecturas antes de cerrar.')
    }

    const needsReviewReadings = allReadings.filter(r => r.needs_review)
    const needsReviewWarnings: string[] = needsReviewReadings.map(r => {
      const customer = activeCustomers.find(c => c.id === r.customer_id)
      return customer?.supply_number || r.customer_id || ''
    })

    const receiptPayloads: {
      customer_id: string; reading_id: string; previous_reading: number; current_reading: number;
      consumption_kwh: number; period_start: string; period_end: string; energy_amount: number;
      fixed_charges: number; subtotal: number; previous_debt: number;
      total_amount: number; issue_date: string; due_date: string
    }[] = []
    const skippedCustomers: string[] = []
    const errors: string[] = []

    for (const customer of activeCustomers) {
      try {
        const customerReadings = allReadings.filter(r => r.customer_id === customer.id)
        if (customerReadings.length === 0) {
          skippedCustomers.push(customer.supply_number || customer.id)
          continue
        }
        const customerReading = customerReadings.sort((a, b) =>
          new Date(b.reading_date || 0).getTime() - new Date(a.reading_date || 0).getTime()
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
            fixedCharges = Math.round((fixedCharges + concept.amount) * 100) / 100
          } else if (concept.type === 'per_kwh') {
            fixedCharges = Math.round((fixedCharges + consumption * concept.amount) * 100) / 100
          }
        }

        const sortedTiers = tiers.length > 0
          ? [...tiers].sort((a, b) => a.min_kwh - b.min_kwh)
          : []

        percentageBase = Math.round(((sortedTiers.length > 0 ? calculateEnergyAmount(consumption, sortedTiers) : 0) + fixedCharges) * 100) / 100

        for (const concept of activeConcepts) {
          if (concept.applies_to_tariff_id && concept.applies_to_tariff_id !== customer.tariff_id) {
            continue
          }

          if (concept.type === 'percentage') {
            fixedCharges = Math.round((fixedCharges + (percentageBase * concept.amount) / 100) * 100) / 100
          }
        }

        fixedCharges = Math.round(fixedCharges * 100) / 100
        const previousDebt = customer.current_debt || 0

        const receipt = calculateTotalReceipt(consumption, sortedTiers, fixedCharges, previousDebt)

        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + graceDays)

        receiptPayloads.push({
          customer_id: customer.id,
          reading_id: customerReading.id,
          previous_reading: customerReading.previous_reading || 0,
          current_reading: customerReading.current_reading || 0,
          consumption_kwh: consumption,
          period_start: period.start_date,
          period_end: period.end_date,
          energy_amount: receipt.energy_amount,
          fixed_charges: receipt.fixed_charges,
          subtotal: receipt.subtotal,
          previous_debt: previousDebt,
          total_amount: receipt.total_amount,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
        })
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`Cliente ${customer.id}: ${msg}`)
      }
    }

    const { data: rpcResult, error: rpcError } = await this.supabase
      .rpc('generate_period_receipts', {
        p_period_id: id,
        p_receipts: receiptPayloads,
      })

    if (rpcError) throw rpcError

    const generatedCount = rpcResult?.[0]?.generated_count ?? 0
    const skippedCount = (rpcResult?.[0]?.skipped_count ?? 0) + skippedCustomers.length

  const { data: closeResult, error: closeError } = await this.supabase
    .rpc('close_billing_period', { p_period_id: id })

  if (closeError || !closeResult || closeResult.length === 0 || !closeResult[0].success) {
    try {
      const { error: rollbackError } = await this.supabase
        .from('receipts')
        .delete()
        .eq('billing_period_id', id)
      if (rollbackError) {
        console.error('Rollback failed: could not delete receipts for period', id, rollbackError)
      }
    } catch (rollbackErr) {
      console.error('Rollback exception: could not delete receipts for period', id, rollbackErr)
    }
    if (closeError) throw closeError
    throw new Error('El periodo ya está cerrado o no existe')
  }

    if (userId) {
      try {
        await this.auditSvc.log({
          table_name: 'billing_periods',
          record_id: id,
          action: 'UPDATE',
          new_data: { is_closed: true, receipts_generated: generatedCount, skipped: skippedCount, errors },
          user_id: userId
        })
      } catch (e) {
        console.error('Audit log failed for closePeriod:', e)
      }
    }

    return {
      period_id: id,
      receiptsGenerated: generatedCount,
      skipped: skippedCount,
      errors,
      needsReviewWarnings,
    }
  }
}

export function getPeriodService(supabaseClient: SupabaseClient<Database>) {
  return new PeriodService(supabaseClient)
}
