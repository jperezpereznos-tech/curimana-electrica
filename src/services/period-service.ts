import { PeriodRepository } from '@/repositories/period-repository'
import { CustomerRepository } from '@/repositories/customer-repository'
import { ReadingRepository } from '@/repositories/reading-repository'
import { ReceiptRepository } from '@/repositories/receipt-repository'
import { ConceptRepository } from '@/repositories/concept-repository'
import { MunicipalityConfigRepository } from '@/repositories/municipality-config-repository'
import { AuditService } from '@/services/audit-service'
import { calculateBreakdown, type BillingConcept } from '@/lib/billing-utils'
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
      this.auditSvc.log({
        table_name: 'billing_periods',
        record_id: result.id,
        action: 'INSERT',
        new_data: periodData,
        user_id: userId
      }).catch((e) => { console.error('Audit log failed for createNextPeriod:', e) })
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

    const readingsByCustomerId = new Map<string, typeof allReadings>()
    for (const r of allReadings) {
      const key = r.customer_id ?? ''
      const list = readingsByCustomerId.get(key)
      if (list) list.push(r)
      else readingsByCustomerId.set(key, [r])
    }

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
        const customerReadings = readingsByCustomerId.get(customer.id)
        if (!customerReadings || customerReadings.length === 0) {
          skippedCustomers.push(customer.supply_number || customer.id)
          continue
        }
        let customerReading = customerReadings[0]
        let maxDate = customerReadings[0].reading_date ? new Date(customerReadings[0].reading_date!).getTime() : 0
        for (let i = 1; i < customerReadings.length; i++) {
          const d = customerReadings[i].reading_date ? new Date(customerReadings[i].reading_date!).getTime() : 0
          if (d > maxDate) { maxDate = d; customerReading = customerReadings[i] }
        }

        const consumption = customerReading.consumption || 0
        const tariff = customer.tariffs
        const tiers = tariff?.tariff_tiers || []

      const sortedTiers = tiers.length > 0
        ? [...tiers].sort((a, b) => a.min_kwh - b.min_kwh)
        : []

      const billingConcepts: BillingConcept[] = activeConcepts
        .filter(c => !c.applies_to_tariff_id || c.applies_to_tariff_id === customer.tariff_id)
        .map(c => ({
          name: c.name,
          amount: c.amount,
          type: (c.type === 'per_kwh' ? 'per_kwh' : c.type === 'percentage' ? 'percentage' : 'fixed') as BillingConcept['type'],
        }))

      const breakdown = calculateBreakdown(consumption, sortedTiers, billingConcepts, customer.current_debt || 0)

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
        energy_amount: breakdown.energyAmount,
        fixed_charges: breakdown.fixedCharges,
        subtotal: breakdown.subtotal,
        previous_debt: customer.current_debt || 0,
        total_amount: breakdown.totalAmount,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
      })
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        errors.push(`Cliente ${customer.id}: ${msg}`)
      }
    }

  const { data: rpcResult, error: rpcError } = await this.supabase
    .rpc('close_period_full', {
      p_period_id: id,
      p_receipts: receiptPayloads,
    })

  if (rpcError) throw rpcError

  const generatedCount = rpcResult?.[0]?.generated_count ?? 0
  const skippedCount = (rpcResult?.[0]?.skipped_count ?? 0) + skippedCustomers.length

    if (userId) {
      this.auditSvc.log({
        table_name: 'billing_periods',
        record_id: id,
        action: 'UPDATE',
        new_data: { is_closed: true, receipts_generated: generatedCount, skipped: skippedCount, errors },
        user_id: userId
      }).catch((e) => { console.error('Audit log failed for closePeriod:', e) })
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
